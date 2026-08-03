/**
 * Peta alias skill (engine v3).
 *
 * MASALAH YANG DIPECAHKAN: engine v2 mencocokkan skill dengan substring dua arah
 * (`entry.includes(needle) || needle.includes(entry)`), sehingga:
 * - "Java" dianggap tercakup oleh "JavaScript"
 * - "R" tercakup oleh "Retail", "Go" oleh "Google", "C" oleh hampir semua kata
 * - "AI" tercakup oleh "Mail"
 * Efek berantainya fatal: matchedMust membengkak → coverage palsu → mode saran
 * salah ("optimize" untuk CV yang sebenarnya lintas bidang).
 *
 * SOLUSI: pencocokan berbasis TOKEN (kata utuh) untuk skill satu kata dan frasa
 * utuh untuk skill multi-kata. Kemiripan yang SAH ditangani eksplisit di sini.
 *
 * ATURAN MENAMBAH GRUP:
 * 1. Satu grup = SATU skill dengan penulisan berbeda, bukan skill yang mirip.
 *    (Jest dan Vitest bukan alias. React dan Next.js bukan alias.)
 * 2. Tulis semua anggota dalam bentuk ternormalisasi: huruf kecil, hanya sisakan
 *    spasi dan karakter + # . / - (lihat `normalize()` di guardrail/postCheck).
 * 3. Prioritaskan istilah yang benar-benar dipakai lowongan Indonesia.
 */
export const SKILL_ALIAS_GROUPS: string[][] = [
  // --- Bahasa & runtime ---
  ["javascript", "js", "ecmascript", "java script"],
  ["typescript", "ts"],
  ["node.js", "nodejs", "node js", "node"],
  ["python", "phyton"],
  ["golang", "go", "go lang"],
  ["c#", "c sharp", "csharp", ".net", "dotnet", "dot net"],
  ["c++", "cpp", "c plus plus"],
  ["r", "bahasa r", "r language"],
  ["php"],
  ["java"],
  ["kotlin"],
  ["swift"],
  ["dart"],

  // --- Frontend ---
  ["react", "reactjs", "react.js", "react js"],
  ["next.js", "nextjs", "next js"],
  ["vue", "vuejs", "vue.js", "vue js"],
  ["nuxt", "nuxtjs", "nuxt.js"],
  ["angular", "angularjs", "angular js"],
  ["svelte", "sveltekit"],
  ["tailwind", "tailwindcss", "tailwind css"],
  ["bootstrap"],
  ["react native", "reactnative", "react-native"],
  ["flutter"],

  // --- Backend & data ---
  ["laravel"],
  ["codeigniter", "code igniter", "ci4"],
  ["spring boot", "springboot"],
  ["django"],
  ["flask"],
  ["fastapi", "fast api"],
  ["express", "expressjs", "express.js"],
  ["rest api", "restful api", "api rest", "restful"],
  ["graphql", "graph ql"],
  ["postgresql", "postgres", "psql", "postgre"],
  ["mysql", "my sql", "mariadb"],
  ["mongodb", "mongo"],
  ["redis"],
  ["sql", "structured query language"],
  ["prisma"],

  // --- Infra & tooling ---
  ["docker", "dockerize", "containerisasi", "containerization"],
  ["kubernetes", "k8s"],
  ["ci/cd", "cicd", "ci cd", "continuous integration", "continuous deployment"],
  ["git", "github", "gitlab", "version control", "kontrol versi"],
  ["aws", "amazon web services"],
  ["gcp", "google cloud", "google cloud platform"],
  ["linux", "unix"],
  ["testing", "unit testing", "unit test", "pengujian", "automated testing"],

  // --- Desain & produk ---
  ["ui/ux", "ui ux", "uiux", "ui dan ux", "user interface user experience"],
  ["figma"],
  ["adobe photoshop", "photoshop", "ps"],
  ["adobe illustrator", "illustrator"],
  ["canva"],
  ["wireframe", "wireframing", "prototyping", "prototipe"],
  ["user research", "riset pengguna"],

  // --- Data & analitik ---
  ["excel", "microsoft excel", "ms excel"],
  ["google sheets", "spreadsheet", "google spreadsheet"],
  ["power bi", "powerbi"],
  ["tableau"],
  ["looker studio", "google data studio", "data studio"],
  ["data analysis", "analisis data", "analisa data"],
  ["machine learning", "ml", "pembelajaran mesin"],
  ["artificial intelligence", "ai", "kecerdasan buatan"],

  // --- Marketing & bisnis ---
  ["digital marketing", "pemasaran digital"],
  ["social media", "media sosial", "sosmed", "social media management"],
  ["copywriting", "copy writing", "penulisan konten", "content writing"],
  ["seo", "search engine optimization", "optimasi mesin pencari"],
  ["sem", "google ads", "google adwords", "search engine marketing"],
  ["meta ads", "facebook ads", "fb ads", "instagram ads"],
  ["tiktok ads"],
  ["crm", "customer relationship management"],
  ["sales", "penjualan", "jualan", "salesman"],
  ["marketing", "pemasaran"],
  ["customer service", "layanan pelanggan", "pelayanan pelanggan"],

  // --- Keuangan & operasional ---
  ["akuntansi", "accounting"],
  ["pajak", "perpajakan", "tax", "brevet"],
  ["accurate", "software accurate"],
  ["administrasi", "administration", "admin"],
  ["human resources", "hr", "sdm", "hrd"],
  ["rekrutmen", "recruitment", "talent acquisition"],
  ["payroll", "penggajian"],

  // --- Cara kerja ---
  ["project management", "manajemen proyek", "manajemen project"],
  ["agile", "scrum", "sprint", "metodologi agile"],
  ["jira", "atlassian jira"],
  ["notion"],
  ["trello"],

  // --- Soft skill & bahasa ---
  ["bahasa inggris", "english", "toefl", "ielts"],
  ["komunikasi", "communication", "communication skill"],
  ["kepemimpinan", "leadership", "memimpin tim"],
  ["problem solving", "pemecahan masalah", "analisis masalah"],
  ["teamwork", "kerja sama tim", "kerjasama tim", "kolaborasi tim"],
  ["public speaking", "berbicara di depan umum", "presentasi"],
]

const ALIAS_INDEX = new Map<string, string[]>()
for (const group of SKILL_ALIAS_GROUPS) {
  for (const member of group) {
    const existing = ALIAS_INDEX.get(member) ?? []
    ALIAS_INDEX.set(member, Array.from(new Set([...existing, ...group])))
  }
}

/**
 * Varian pendek ("go", "r", "ai", "js") terlalu berisiko dicocokkan ke seluruh
 * isi CV — hanya boleh dicari di daftar skill/section eksplisit, bukan di
 * kalimat bebas seperti "go to market" atau "AI-powered".
 */
export function isShortToken(variant: string): boolean {
  return variant.replace(/[^a-z0-9]/g, "").length <= 2
}

/** Perluas satu skill lowongan (sudah ternormalisasi) jadi seluruh varian sahnya. */
export function expandSkill(normalizedSkill: string): string[] {
  const variants = new Set<string>(ALIAS_INDEX.get(normalizedSkill) ?? [])
  variants.add(normalizedSkill)
  const compact = normalizedSkill.replace(/[.\s-]/g, "")
  if (compact && compact !== normalizedSkill) variants.add(compact)
  return Array.from(variants).filter(Boolean)
}
