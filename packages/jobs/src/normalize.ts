import type { RawJob, RemoteType } from "./providers/types.js";

/**
 * Normalisasi lowongan (PRD Cari Lowongan §12.1).
 *
 * Semua di file ini DETERMINISTIK — tanpa LLM. Alasannya sederhana: normalisasi
 * dijalankan untuk puluhan ribu baris per ingestion run, jadi harganya harus nol
 * dan hasilnya harus sama setiap kali dijalankan supaya fingerprint dedupe stabil.
 */

export type NormalizedJob = RawJob & {
  titleNorm: string;
  companyNorm: string;
  locationNorm: string | null;
  city: string | null;
  remoteType: RemoteType | null;
  skillTerms: string[];
  descriptionSnippet: string;
};

const SNIPPET_MAX = 600;

/** Suffix badan usaha — dibuang agar "PT Gojek Indonesia" == "Gojek". */
const COMPANY_NOISE = [
  "pt",
  "cv",
  "tbk",
  "persero",
  "inc",
  "ltd",
  "llc",
  "gmbh",
  "corp",
  "corporation",
  "company",
  "co",
  "group",
  "holdings",
  "indonesia",
  "asia",
  "global",
  "technologies",
  "technology",
];

/** Kota Indonesia + alias yang sering dipakai di portal lowongan. */
const CITY_ALIASES: Record<string, string> = {
  jakarta: "Jakarta",
  "jakarta selatan": "Jakarta",
  "jakarta pusat": "Jakarta",
  "jakarta barat": "Jakarta",
  "jakarta timur": "Jakarta",
  "jakarta utara": "Jakarta",
  jaksel: "Jakarta",
  dki: "Jakarta",
  "dki jakarta": "Jakarta",
  jabodetabek: "Jakarta",
  bogor: "Bogor",
  depok: "Depok",
  tangerang: "Tangerang",
  "tangerang selatan": "Tangerang",
  bsd: "Tangerang",
  bekasi: "Bekasi",
  bandung: "Bandung",
  semarang: "Semarang",
  yogyakarta: "Yogyakarta",
  jogja: "Yogyakarta",
  diy: "Yogyakarta",
  solo: "Surakarta",
  surakarta: "Surakarta",
  surabaya: "Surabaya",
  malang: "Malang",
  denpasar: "Denpasar",
  bali: "Denpasar",
  medan: "Medan",
  palembang: "Palembang",
  makassar: "Makassar",
  batam: "Batam",
  pekanbaru: "Pekanbaru",
  balikpapan: "Balikpapan",
  samarinda: "Samarinda",
  manado: "Manado",
  singapore: "Singapore",
  "kuala lumpur": "Kuala Lumpur",
};

/** Kata pengganggu pada judul lowongan yang menghalangi pencocokan. */
const TITLE_NOISE =
  /\b(urgent(ly)?|hiring|dibutuhkan|dicari|segera|wfh|wfo|fresh graduate|freshgraduate|full[- ]?time|part[- ]?time|kontrak|contract|internship|intern|magang|remote|hybrid|onsite|on[- ]site)\b/gi;

const SENIORITY_NOISE = /\b(jr|sr|snr)\.?(?=\s|\b|$)/gi;

/**
 * Kamus skill. Dipakai untuk mengisi mustHaveSkills saat memberi skor kandidat
 * tanpa memanggil LLM — SATU call LLM per pencarian adalah batas yang dijaga PRD.
 */
const SKILL_DICTIONARY: string[] = [
  "javascript",
  "typescript",
  "react",
  "next.js",
  "vue",
  "nuxt",
  "angular",
  "svelte",
  "node.js",
  "express",
  "nestjs",
  "php",
  "laravel",
  "codeigniter",
  "python",
  "django",
  "flask",
  "fastapi",
  "java",
  "spring boot",
  "kotlin",
  "swift",
  "objective-c",
  "flutter",
  "dart",
  "react native",
  "go",
  "golang",
  "rust",
  "ruby",
  "rails",
  "c#",
  ".net",
  "c++",
  "sql",
  "mysql",
  "postgresql",
  "mongodb",
  "redis",
  "elasticsearch",
  "graphql",
  "rest api",
  "grpc",
  "docker",
  "kubernetes",
  "terraform",
  "aws",
  "gcp",
  "azure",
  "ci/cd",
  "jenkins",
  "github actions",
  "linux",
  "nginx",
  "kafka",
  "rabbitmq",
  "microservices",
  "prisma",
  "tailwind",
  "figma",
  "ui/ux",
  "wireframe",
  "prototyping",
  "design system",
  "adobe illustrator",
  "photoshop",
  "after effects",
  "excel",
  "spreadsheet",
  "power bi",
  "tableau",
  "looker",
  "google analytics",
  "data analysis",
  "data engineering",
  "machine learning",
  "deep learning",
  "pytorch",
  "tensorflow",
  "pandas",
  "numpy",
  "airflow",
  "dbt",
  "spark",
  "etl",
  "seo",
  "sem",
  "google ads",
  "meta ads",
  "copywriting",
  "content marketing",
  "social media",
  "crm",
  "hubspot",
  "salesforce",
  "project management",
  "scrum",
  "agile",
  "jira",
  "product management",
  "roadmap",
  "stakeholder management",
  "akuntansi",
  "pajak",
  "payroll",
  "recruitment",
  "customer service",
  "bahasa inggris",
  "english",
  "negosiasi",
  "komunikasi",
];

export function squash(input: string | null | undefined): string {
  return (input ?? "").replace(/\s+/g, " ").trim();
}

export function normalizeTitle(title: string): string {
  return squash(
    title
      .toLowerCase()
      .replace(/\(.*?\)/g, " ")
      .replace(/\[.*?\]/g, " ")
      .replace(TITLE_NOISE, " ")
      .replace(SENIORITY_NOISE, " ")
      .replace(/[^a-z0-9+#./ ]/g, " "),
  );
}

export function normalizeCompany(company: string): string {
  const tokens = squash(company.toLowerCase().replace(/[^a-z0-9 ]/g, " "))
    .split(" ")
    .filter((token) => token && !COMPANY_NOISE.includes(token));
  return tokens.length > 0 ? tokens.join(" ") : squash(company.toLowerCase());
}

export function normalizeLocation(location: string | null | undefined): {
  locationNorm: string | null;
  city: string | null;
} {
  const raw = squash(location).toLowerCase();
  if (!raw) return { locationNorm: null, city: null };

  const parts = raw
    .split(/[,/|\u2022]+/)
    .map((part) => squash(part))
    .filter(Boolean);

  for (const part of [raw, ...parts]) {
    const alias = CITY_ALIASES[part];
    if (alias) return { locationNorm: alias.toLowerCase(), city: alias };
  }
  for (const [alias, city] of Object.entries(CITY_ALIASES)) {
    if (raw.includes(alias)) return { locationNorm: city.toLowerCase(), city };
  }
  return { locationNorm: parts[0] ?? raw, city: null };
}

export function detectRemoteType(
  explicit: RemoteType | null | undefined,
  text: string,
): RemoteType | null {
  if (explicit) return explicit;
  const value = text.toLowerCase();
  if (/\bhybrid\b/.test(value)) return "hybrid";
  if (/\b(remote|wfh|work from home|anywhere)\b/.test(value)) return "remote";
  if (/\b(onsite|on-site|wfo|work from office)\b/.test(value)) return "onsite";
  return null;
}

/**
 * Gaji bulanan Rupiah kadang datang sebagai angka tahunan atau sudah dalam juta.
 * Nilai yang mustahil dibuang, bukan ditebak — lebih baik tidak menampilkan gaji
 * daripada menampilkan angka yang salah.
 */
export function normalizeSalary(input: {
  min?: number | null;
  max?: number | null;
  currency?: string | null;
  period?: string | null;
}): {
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
  salaryPeriod: string | null;
} {
  const period = squash(input.period).toLowerCase() || null;
  const currency = squash(input.currency).toUpperCase() || null;
  const clean = (value: number | null | undefined): number | null => {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0)
      return null;
    return Math.round(value);
  };
  let min = clean(input.min);
  let max = clean(input.max);
  if (min && max && min > max) [min, max] = [max, min];
  return {
    salaryMin: min,
    salaryMax: max,
    currency,
    salaryPeriod: period === "annum" ? "year" : period,
  };
}

/** Ekstraksi skill berbasis kamus — pengganti parsing LLM saat ingestion. */
export function extractSkillTerms(text: string): string[] {
  const haystack = ` ${text
    .toLowerCase()
    .replace(/\.(?=\s|$)/g, " ")
    .replace(/[^a-z0-9+#./ ]/g, " ")
    .replace(/\s+/g, " ")} `;
  const found = new Set<string>();
  for (const skill of SKILL_DICTIONARY) {
    if (haystack.includes(` ${skill} `)) found.add(skill);
  }
  return [...found];
}

export function buildSnippet(description: string | null | undefined): string {
  const text = squash(description);
  if (text.length <= SNIPPET_MAX) return text;
  return `${text.slice(0, SNIPPET_MAX - 1).trimEnd()}\u2026`;
}

export function normalizeJob(raw: RawJob): NormalizedJob {
  const description = squash(raw.description);
  const { locationNorm, city } = normalizeLocation(raw.location);
  const salary = normalizeSalary({
    min: raw.salaryMin,
    max: raw.salaryMax,
    currency: raw.currency,
    period: raw.salaryPeriod,
  });

  return {
    ...raw,
    title: squash(raw.title),
    company: squash(raw.company),
    titleNorm: normalizeTitle(raw.title),
    companyNorm: normalizeCompany(raw.company),
    locationNorm,
    city,
    remoteType: detectRemoteType(
      raw.remoteType ?? null,
      `${raw.title} ${raw.location ?? ""} ${description.slice(0, 400)}`,
    ),
    ...salary,
    skillTerms: extractSkillTerms(`${raw.title} ${description}`),
    descriptionSnippet: buildSnippet(description),
  };
}
