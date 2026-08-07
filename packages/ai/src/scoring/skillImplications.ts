/**
 * Graf implikasi skill (engine v3.1).
 *
 * MASALAH YANG DIPECAHKAN: `skillAliases.ts` hanya mengenal EKUIVALENSI (relasi
 * dua arah). Tapi "React \u27f9 HTML" bukan ekuivalensi: menguasai React MENJAMIN
 * menguasai HTML, sementara menguasai HTML tidak menjamin apa pun soal React.
 * Kalau relasi ini dipaksa masuk ke grup alias, CV desainer yang menulis
 * "HTML, CSS dasar" akan dianggap menguasai React dan Next.js \u2014 kerusakan yang
 * jauh lebih parah daripada bug aslinya.
 *
 * GEJALA SEBELUM PERBAIKAN: CV yang penuh Next.js / Nuxt 3 / SvelteKit divonis
 * "gap beneran: tidak ada bukti pengalaman HTML". Vonis itu menghina sekaligus
 * salah, DAN ikut menyeret skor turun sampai `pickSuggestionMode` salah pilih
 * mode \u2014 kandidat yang sangat cocok malah diberi nada "kamu kurang cocok".
 *
 * SOLUSI: graf BERARAH yang hidup terpisah dari alias. Panah hanya menunjuk ke
 * bawah (framework \u27f9 fondasi), tidak pernah membalik.
 *
 * ATURAN MENAMBAH EDGE:
 * 1. Arah selalu dari yang LEBIH SPESIFIK ke yang LEBIH DASAR.
 * 2. `certain` HANYA untuk relasi yang mustahil dilanggar (Laravel \u27f9 PHP).
 *    Ragu sedikit saja \u2192 `likely`.
 * 3. Tulis dalam bentuk ternormalisasi (huruf kecil), sama seperti skillAliases.
 * 4. Jaga graf tetap kecil dan berkualitas. Graf besar yang meragukan lebih
 *    berbahaya daripada graf kecil yang tepat \u2014 setiap edge palsu langsung
 *    berubah jadi skor palsu.
 */

export type ImplicationConfidence = "certain" | "likely"

/** Skill CV yang jadi titik berangkat penelusuran. */
export type SkillSource = {
  /** Nama yang enak dibaca user, mis. "Next.js". */
  original: string
  /** Bentuk ternormalisasi (kunci graf). */
  normalized: string
  /**
   * true bila skill muncul di highlight pengalaman / achievement / about \u2014
   * bukan sekadar dicantumkan di daftar skill.
   *
   * Ini penjaga inflasi skor: orang yang menulis "Next.js" setelah menonton satu
   * tutorial tidak boleh memanen react + javascript + html + css secara cuma-cuma.
   */
  strong: boolean
}

export type ImplicationHit = {
  skill: string
  confidence: ImplicationConfidence
  /** Rantai penalaran, mis. ["sveltekit", "svelte", "html"]. */
  path: string[]
  /** Skill CV yang melahirkan kesimpulan ini (untuk ditampilkan sebagai bukti). */
  sources: string[]
}

/**
 * Relasi yang MUSTAHIL dilanggar. Tidak ada cara menulis komponen React tanpa
 * memahami markup, tidak ada cara memakai Laravel tanpa PHP.
 */
const CERTAIN_EDGES: Record<string, string[]> = {
  // Meta-framework \u27f9 framework dasarnya
  "next.js": ["react"],
  nuxt: ["vue"],
  sveltekit: ["svelte"],
  "react native": ["react"],
  "shadcn/ui": ["react", "tailwind"],

  // Framework frontend \u27f9 fondasi web
  react: ["javascript", "html", "css", "dom"],
  vue: ["javascript", "html", "css", "dom"],
  svelte: ["javascript", "html", "css", "dom"],
  angular: ["typescript", "html", "css", "dom"],
  tailwind: ["css"],
  bootstrap: ["css", "html"],

  // Bahasa & runtime
  typescript: ["javascript"],
  "node.js": ["javascript"],
  express: ["node.js"],
  flutter: ["dart"],

  // Backend
  laravel: ["php"],
  codeigniter: ["php"],
  django: ["python"],
  flask: ["python"],
  fastapi: ["python"],
  "spring boot": ["java"],

  // Data
  prisma: ["sql"],
  postgresql: ["sql"],
  mysql: ["sql"],

  // Infra & tooling
  kubernetes: ["docker"],
  github: ["git"],
  gitlab: ["git"],
}

/**
 * Sangat mungkin, tapi ada jalan keluarnya. Orang bisa belajar React sendirian
 * tanpa pernah menyentuh Git, dan bisa saja tidak pernah memanggil REST API.
 * Karena itu bobot skornya diturunkan, bukan penuh.
 */
const LIKELY_EDGES: Record<string, string[]> = {
  react: ["git", "rest api", "responsive design"],
  vue: ["git", "rest api", "responsive design"],
  svelte: ["git", "rest api", "responsive design"],
  angular: ["git", "rest api"],
  "node.js": ["rest api"],
  laravel: ["mysql", "rest api"],
  tailwind: ["responsive design"],
  bootstrap: ["responsive design"],
  docker: ["linux"],
  kubernetes: ["linux"],
  "ci/cd": ["git"],
  ".net": ["c#"],
  figma: ["ui/ux"],
  "machine learning": ["python"],
  "power bi": ["data analysis"],
  tableau: ["data analysis"],
}

/** Nama tampilan untuk skill sumber \u2014 supaya UI tidak menulis "next.js" huruf kecil. */
const DISPLAY_NAMES: Record<string, string> = {
  "next.js": "Next.js",
  nuxt: "Nuxt",
  sveltekit: "SvelteKit",
  svelte: "Svelte",
  react: "React",
  "react native": "React Native",
  vue: "Vue",
  angular: "Angular",
  typescript: "TypeScript",
  "node.js": "Node.js",
  express: "Express",
  tailwind: "Tailwind CSS",
  bootstrap: "Bootstrap",
  "shadcn/ui": "Shadcn/ui",
  laravel: "Laravel",
  codeigniter: "CodeIgniter",
  django: "Django",
  flask: "Flask",
  fastapi: "FastAPI",
  "spring boot": "Spring Boot",
  flutter: "Flutter",
  prisma: "Prisma",
  postgresql: "PostgreSQL",
  mysql: "MySQL",
  kubernetes: "Kubernetes",
  docker: "Docker",
  github: "GitHub",
  gitlab: "GitLab",
  "ci/cd": "CI/CD",
  ".net": ".NET",
  figma: "Figma",
  "machine learning": "Machine Learning",
  "power bi": "Power BI",
  tableau: "Tableau",
}

/** Semua skill yang punya panah keluar \u2014 kandidat titik berangkat penelusuran. */
export const IMPLICATION_ROOTS: string[] = Array.from(
  new Set([...Object.keys(CERTAIN_EDGES), ...Object.keys(LIKELY_EDGES)]),
)

export function displayNameFor(normalizedSkill: string): string {
  return DISPLAY_NAMES[normalizedSkill] ?? normalizedSkill
}

type Edge = { to: string; confidence: ImplicationConfidence }

function edgesOf(skill: string): Edge[] {
  const certain = (CERTAIN_EDGES[skill] ?? []).map(
    (to): Edge => ({ to, confidence: "certain" }),
  )
  const likely = (LIKELY_EDGES[skill] ?? []).map(
    (to): Edge => ({ to, confidence: "likely" }),
  )
  return [...certain, ...likely]
}

/**
 * Batas kedalaman penelusuran. Rantai terpanjang yang masuk akal saat ini ada 3
 * langkah (sveltekit \u2192 svelte \u2192 javascript). Batas 4 memberi ruang tanpa membiarkan
 * kesimpulan melantur terlalu jauh dari bukti aslinya.
 */
const MAX_DEPTH = 4

/**
 * Telusuri seluruh skill yang TERSIRAT dari skill yang benar-benar ada di CV.
 *
 * Sifat penting:
 * - SATU ARAH. Tidak ada jalan dari "html" kembali ke "react".
 * - Keyakinan mengikuti mata rantai TERLEMAH: satu edge `likely` di tengah jalan
 *   membuat seluruh kesimpulan jadi `likely`.
 * - Sumber lemah (skill cuma tercantum di daftar, tanpa jejak di pengalaman)
 *   diturunkan: `certain` \u2192 `likely`, dan `likely` dibuang sama sekali.
 */
export function expandImplications(sources: SkillSource[]): Map<string, ImplicationHit> {
  const result = new Map<string, ImplicationHit>()

  for (const source of sources) {
    const start = source.normalized
    if (!start) continue

    const seen = new Set<string>([start])
    const queue: Array<{ skill: string; confidence: ImplicationConfidence; path: string[] }> = [
      { skill: start, confidence: "certain", path: [start] },
    ]

    while (queue.length > 0) {
      const node = queue.shift()
      if (!node) break
      if (node.path.length > MAX_DEPTH) continue

      for (const edge of edgesOf(node.skill)) {
        if (seen.has(edge.to)) continue
        seen.add(edge.to)

        // Mata rantai terlemah menentukan keyakinan seluruh jalur.
        const chained: ImplicationConfidence =
          node.confidence === "likely" || edge.confidence === "likely" ? "likely" : "certain"
        const path = [...node.path, edge.to]

        // Turunkan derajat bila skill sumbernya tidak didukung bukti pengalaman.
        const effective: ImplicationConfidence | null = source.strong
          ? chained
          : chained === "certain"
            ? "likely"
            : null

        if (effective) {
          const existing = result.get(edge.to)
          if (!existing) {
            result.set(edge.to, {
              skill: edge.to,
              confidence: effective,
              path,
              sources: [source.original],
            })
          } else {
            // Kesimpulan yang lebih kuat menang; sumber lain tetap dicatat sebagai bukti tambahan.
            if (existing.confidence === "likely" && effective === "certain") {
              existing.confidence = "certain"
              existing.path = path
            }
            if (!existing.sources.includes(source.original)) {
              existing.sources.push(source.original)
            }
          }
        }

        // Tetap ditelusuri lebih dalam walau simpul ini dibuang, karena simpul di
        // bawahnya bisa saja masih layak.
        queue.push({ skill: edge.to, confidence: chained, path })
      }
    }
  }

  return result
}
