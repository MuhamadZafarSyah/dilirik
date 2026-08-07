import { distinctiveTokens, normalize } from "../guardrail/postCheck"

/**
 * Peta KONSEP → IMPLEMENTASI.
 *
 * Lowongan menulis konsep ("OCR", "data visualization", "enkripsi data"),
 * sedangkan CV menulis implementasi ("PaddleOCR", "ApexCharts", "AES-256-GCM").
 * Pencocokan token tidak akan pernah menyatukan keduanya: token `ocr` bukan
 * token `paddleocr`, dan `enkripsi` sama sekali tidak menyerupai `aes`.
 *
 * Akibatnya rule-based jujur melaporkan "tidak cocok", lalu model menelan
 * laporan itu sebagai kesimpulan dan menulis "tidak ada pengalaman OCR di CV"
 * untuk CV yang jelas-jelas memakai PaddleOCR. Peta ini memutus rantai itu
 * secara deterministik — tanpa LLM, tanpa biaya token, dan bisa diuji.
 *
 * Ini BUKAN pengganti graf implikasi di `skillImplications.ts`:
 * - implikasi skill : arah PASTI menurun (SvelteKit ⟹ Svelte ⟹ HTML) → menambah skor.
 * - konsep → impl   : DUGAAN bahwa faktanya ada tapi tidak tersaji → bahan gap
 *                     penyajian, TIDAK menambah skor.
 */

export type ConceptEvidence = {
  /** Istilah konkret yang terdeteksi di CV, mis. "paddleocr". */
  term: string
  /** Potongan teks CV apa adanya yang memuat istilah itu — dipakai sebagai kutipan. */
  quote: string
}

/** Maksimum bukti per requirement — cukup meyakinkan, tidak membanjiri prompt. */
const MAX_EVIDENCE_PER_SKILL = 2

/**
 * Daftar istilah SENGAJA dipilih yang tidak muncul sebagai substring kata lain.
 * Istilah seperti "aes", "rsa", "aria", "expo", "axe", dan "sse" sudah diuji dan
 * DIBUANG karena masing-masing bersembunyi di dalam kata biasa ("aesthetic",
 * "versa", "variabel", "export", "taxes", "assessment").
 */
const CONCEPT_MAP: Array<{ concepts: string[]; terms: string[] }> = [
  {
    concepts: ["ocr", "optical character recognition", "pengenalan karakter", "ekstraksi teks"],
    terms: ["paddleocr", "tesseract", "easyocr", "google vision", "textract", "document ai"],
  },
  {
    concepts: [
      "data visualization",
      "data visualisation",
      "visualisasi data",
      "chart",
      "charting",
      "grafik",
      "dashboard analitik",
    ],
    terms: [
      "apexcharts",
      "chart.js",
      "chartjs",
      "recharts",
      "highcharts",
      "echarts",
      "plotly",
      "nivo",
      "d3.js",
      "visx",
    ],
  },
  {
    concepts: [
      "computer vision",
      "visi komputer",
      "deteksi objek",
      "image processing",
      "pengolahan citra",
    ],
    terms: ["mediapipe", "opencv", "yolo", "tensorflow", "teachable machine", "roboflow"],
  },
  {
    concepts: [
      "enkripsi",
      "encryption",
      "kriptografi",
      "cryptography",
      "keamanan data",
      "data security",
    ],
    terms: [
      "encryption",
      "encrypt",
      "enkrip",
      "aes-256",
      "aes-128",
      "gcm",
      "bcrypt",
      "argon2",
      "libsodium",
      "crypto-js",
      "sha-256",
    ],
  },
  {
    concepts: [
      "design system",
      "sistem desain",
      "design token",
      "component library",
      "component-driven",
    ],
    terms: [
      "storybook",
      "shadcn",
      "radix",
      "reusable component",
      "komponen reusable",
      "design token",
      "atomic design",
      "chromatic",
    ],
  },
  {
    concepts: [
      "automated testing",
      "unit testing",
      "e2e testing",
      "end-to-end testing",
      "pengujian otomatis",
      "test automation",
    ],
    terms: ["jest", "vitest", "playwright", "cypress", "testing library", "mocha", "puppeteer"],
  },
  {
    concepts: ["ci/cd", "continuous integration", "continuous deployment", "pipeline deployment"],
    terms: ["github actions", "gitlab ci", "jenkins", "circleci", "argocd", "drone ci"],
  },
  {
    concepts: ["state management", "manajemen state"],
    terms: ["redux", "zustand", "pinia", "vuex", "jotai", "mobx", "recoil", "context api"],
  },
  {
    concepts: ["realtime", "real-time", "websocket", "streaming data"],
    terms: ["socket.io", "websocket", "pusher", "supabase realtime", "server-sent events"],
  },
  {
    concepts: ["authentication", "otentikasi", "autentikasi", "single sign-on", "manajemen sesi"],
    terms: ["better auth", "next-auth", "auth.js", "keycloak", "oauth", "jwt", "clerk", "passport"],
  },
  {
    concepts: ["orm", "database query", "query builder"],
    terms: ["prisma", "drizzle", "typeorm", "sequelize", "eloquent", "knex"],
  },
  {
    concepts: ["containerization", "kontainerisasi", "container"],
    terms: ["docker", "podman", "kubernetes", "docker compose"],
  },
  {
    concepts: ["mobile development", "pengembangan mobile", "aplikasi mobile", "cross-platform"],
    terms: ["flutter", "react native", "ionic", "capacitor"],
  },
  {
    concepts: ["accessibility", "aksesibilitas", "wcag", "a11y"],
    terms: ["wcag", "screen reader", "aria-label", "semantic html", "axe-core"],
  },
  {
    concepts: ["seo", "search engine optimization", "optimasi mesin pencari"],
    terms: ["sitemap", "robots.txt", "json-ld", "structured data", "open graph", "meta tag"],
  },
]

/**
 * Cari bukti di CV bahwa sebuah requirement SEBENARNYA sudah dikerjakan, hanya
 * tidak memakai istilah yang dipakai lowongan.
 *
 * @param skill requirement lowongan yang rule-based nyatakan tidak tercakup.
 * @param corpusEntries potongan teks CV APA ADANYA (belum dinormalisasi) —
 *   dipakai sebagai kutipan, jadi harus dalam bentuk aslinya.
 */
export function findConceptEvidence(skill: string, corpusEntries: string[]): ConceptEvidence[] {
  const needle = normalize(skill)
  if (!needle) return []

  const terms = new Set<string>()
  for (const { concepts, terms: implementations } of CONCEPT_MAP) {
    if (!concepts.some((concept) => needle.includes(concept))) continue
    for (const term of implementations) terms.add(term)
  }
  // Jangkar harfiah: menangkap "OCR" di dalam "PaddleOCR", yang lolos dari
  // pencocokan token karena `ocr` dan `paddleocr` adalah dua token berbeda.
  for (const token of distinctiveTokens(needle)) terms.add(token)
  if (terms.size === 0) return []

  const found: ConceptEvidence[] = []
  const seen = new Set<string>()
  for (const entry of corpusEntries) {
    if (found.length >= MAX_EVIDENCE_PER_SKILL) break
    const haystack = normalize(entry)
    if (!haystack) continue
    for (const term of terms) {
      if (!haystack.includes(term)) continue
      const quote = entry.trim()
      if (!seen.has(quote)) {
        seen.add(quote)
        found.push({ term, quote })
      }
      break
    }
  }
  return found
}
