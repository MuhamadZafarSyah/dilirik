/**
 * Peta alias skill (engine v3).
 *
 * MASALAH YANG DIPECAHKAN: engine v2 mencocokkan skill dengan substring dua arah
 * (`entry.includes(needle) || needle.includes(entry)`), sehingga:
 * - "Java" dianggap tercakup oleh "JavaScript"
 * - "R" tercakup oleh "Retail", "Go" oleh "Google", "C" oleh hampir semua kata
 * - "AI" tercakup oleh "Mail"
 * Efek berantainya fatal: matchedMust membengkak \u2192 coverage palsu \u2192 mode saran
 * salah ("optimize" untuk CV yang sebenarnya lintas bidang).
 *
 * SOLUSI: pencocokan berbasis TOKEN (kata utuh) untuk skill satu kata dan frasa
 * utuh untuk skill multi-kata. Kemiripan yang SAH ditangani eksplisit di sini.
 *
 * BATAS TANGGUNG JAWAB FILE INI (v3.1): hanya EKUIVALENSI \u2014 penulisan berbeda
 * untuk skill yang sama. Relasi turunan satu arah ("SvelteKit \u27f9 Svelte",
 * "React \u27f9 HTML") TIDAK boleh masuk ke sini, karena `ALIAS_INDEX` bersifat
 * simetris: memasukkannya berarti CV yang cuma menulis "Svelte" ikut dianggap
 * menguasai "SvelteKit". Relasi semacam itu tinggal di `skillImplications.ts`.
 *
 * ATURAN MENAMBAH GRUP:
 * 1. Satu grup = SATU skill dengan penulisan berbeda, bukan skill yang mirip.
 *    (Jest dan Vitest bukan alias. React dan Next.js bukan alias.)
 * 2. Tulis semua anggota dalam bentuk ternormalisasi: huruf kecil, hanya sisakan
 *    spasi dan karakter + # . / - (lihat `normalize()` di guardrail/postCheck).
 * 3. Prioritaskan istilah yang benar-benar dipakai lowongan Indonesia.
 * 4. Uji cepat sebelum menambah: kalau A \u27f9 B benar tapi B \u27f9 A salah, itu BUKAN
 *    alias \u2014 tempatnya di skillImplications.ts.
 */
export const SKILL_ALIAS_GROUPS: string[][] = [
  // --- Bahasa & runtime ---
  ["javascript", "js", "ecmascript", "java script", "es6", "es2015"],
  ["typescript", "ts"],
  ["node.js", "nodejs", "node js", "node"],
  ["python", "phyton"],
  ["golang", "go", "go lang"],
  ["c#", "c sharp", "csharp"],
  // .NET adalah platform, C# adalah bahasa \u2014 bukan hal yang sama (F#/VB juga .NET).
  // Relasi ".net \u27f9 c#" ditangani sebagai implikasi `likely`.
  [".net", "dotnet", "dot net", "net framework", "asp.net"],
  ["c++", "cpp", "c plus plus"],
  ["r", "bahasa r", "r language"],
  ["php"],
  ["java"],
  ["kotlin"],
  ["swift"],
  ["dart"],

  // --- Fondasi web ---
  // Sengaja dipisah dari framework: ini yang jadi sasaran implikasi.
  ["html", "html5", "hypertext markup language"],
  ["css", "css3", "cascading style sheets"],
  ["dom", "document object model"],
  ["responsive design", "responsive", "desain responsif", "responsive web design", "mobile first"],
  ["web accessibility", "aksesibilitas", "a11y", "wcag"],

  // --- Frontend ---
  ["react", "reactjs", "react.js", "react js"],
  ["next.js", "nextjs", "next js"],
  ["vue", "vuejs", "vue.js", "vue js"],
  ["nuxt", "nuxtjs", "nuxt.js"],
  ["angular", "angularjs", "angular js"],
  // SvelteKit dibangun DI ATAS Svelte \u2014 hubungan induk-anak, bukan alias.
  ["svelte"],
  ["sveltekit", "svelte kit"],
  ["tailwind", "tailwindcss", "tailwind css"],
  ["bootstrap"],
  ["shadcn/ui", "shadcn", "shadcn ui"],
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
  // GitHub/GitLab adalah platform DI ATAS Git \u2014 implikasi, bukan ekuivalensi.
  ["git", "version control", "kontrol versi"],
  ["github"],
  ["gitlab"],
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
 * isi CV \u2014 hanya boleh dicari di daftar skill/section eksplisit, bukan di
 * kalimat bebas seperti "go to market" atau "AI-powered".
 */
export function isShortToken(variant: string): boolean {
  return variant.replace(/[^a-z0-9]/g, "").length <= 2
}

/** Apakah istilah ini dikenal engine? Dipakai untuk memutuskan aman-tidaknya memecah requirement majemuk. */
export function isKnownTerm(term: string): boolean {
  return ALIAS_INDEX.has(term)
}

/**
 * Buang akhiran versi bila sisanya istilah yang dikenal: "html5" \u2192 "html",
 * "vue 3" \u2192 "vue", "svelte 5" \u2192 "svelte".
 *
 * Lowongan nyata sangat sering menulis versi, dan tanpa ini "HTML5" tidak akan
 * pernah cocok dengan "HTML" \u2014 sumber gap palsu yang sulit terlihat.
 * Syarat "sisanya harus istilah dikenal" mencegah pemotongan ngawur seperti
 * "C4" atau "Level 2".
 */
export function stripVersionSuffix(term: string): string {
  const match = /^([a-z#+./ -]{2,}?)\s?\d{1,2}$/.exec(term)
  if (!match) return term
  const base = (match[1] ?? "").trim()
  return base && ALIAS_INDEX.has(base) ? base : term
}

/** Perluas satu skill lowongan (sudah ternormalisasi) jadi seluruh varian sahnya. */
export function expandSkill(normalizedSkill: string): string[] {
  const variants = new Set<string>(ALIAS_INDEX.get(normalizedSkill) ?? [])
  variants.add(normalizedSkill)
  const compact = normalizedSkill.replace(/[.\s-]/g, "")
  if (compact && compact !== normalizedSkill) variants.add(compact)
  return Array.from(variants).filter(Boolean)
}
