import { z } from "zod"

/** Skor semantic dari AI (digabung dengan rule-based). */
export const semanticScoreSchema = z.object({
  score: z.number().min(0).max(100),
  reasoning: z.string().max(600),
  matchedPairs: z
    .array(z.object({ jobSkill: z.string(), cvEvidence: z.string() }))
    .default([]),
})

/** Mode strategi saran \u2014 dipilih DETERMINISTIK di kode dari coverage must-have (bukan oleh LLM). */
export const SUGGESTION_MODES = ["optimize", "reframe", "honest_pivot"] as const
export type SuggestionMode = (typeof SUGGESTION_MODES)[number]

/**
 * Gap \u2014 taksonomi penuh (engine v3.2):
 * - type:
 *   - "real" = tidak ada jejaknya di CV.
 *   - "presentation" = ada faktanya di CV tapi tak terlihat.
 *   - "implied" = SUDAH DIPASTIKAN dikuasai lewat skill lain (React \u27f9 HTML).
 *     Bukan kekurangan. Nilai tambahan sebagai kata kunci ATS ditangani lewat
 *     `keywordGapSchema`, bukan di sini \u2014 laporan gap harus tetap berisi hal
 *     yang benar-benar kurang.
 * - severity: "must" = dari requirement wajib; "nice" = nice-to-have.
 * - fixability:
 *   - "fixable_by_editing": faktanya ADA di CV, tinggal disajikan \u2192 hanya jenis ini yang boleh melahirkan saran revisi.
 *   - "requires_experience": jujur \u2014 butuh pengalaman/belajar nyata, tidak bisa ditambal tulisan.
 *   - "fit_constraint": faktor kecocokan non-skill (atribut personal/lokasi/identitas) \u2014 informasi netral, bukan bahan saran.
 */
export const gapSchema = z.object({
  type: z.enum(["real", "presentation", "implied"]).catch("real"),
  skill: z.string(),
  explanation: z.string(),
  advice: z.string(),
  severity: z.enum(["must", "nice"]).default("must"),
  fixability: z
    .enum(["fixable_by_editing", "requires_experience", "fit_constraint"])
    .default("requires_experience"),
  /**
   * Kutipan VERBATIM teks CV yang membuktikan gap ini cuma soal penyajian.
   *
   * WAJIB untuk type "presentation". Kewajiban MENGUTIP inilah yang mematikan
   * output isi-blanko: kalimat template seperti "tidak ada pengalaman tentang X"
   * bisa dikarang tanpa membaca CV, tapi kutipan verbatim tidak \u2014 dan kutipan
   * palsu bisa dideteksi kode.
   */
  evidenceQuote: z.string().default(""),
  /**
   * Istilah yang sudah disisir di CV sebelum memutuskan sesuatu benar-benar
   * tidak ada. Memaksa model MENCARI lebih dulu, bukan langsung memvonis.
   */
  searchedFor: z.array(z.string()).default([]),
})

export const gapsSchema = z.object({ gaps: z.array(gapSchema).default([]) })

/**
 * Kata kunci hilang (engine v3.1) \u2014 KELAS TERSENDIRI, bukan gap dan bukan saran.
 *
 * Kenapa tetap ditampilkan padahal kandidat jelas menguasainya: filter ATS
 * mencocokkan kata secara HARFIAH. Kandidat yang membangun 170+ komponen Vue
 * jelas bisa HTML, tapi kalau kata "HTML" tidak pernah muncul di CV, sebagian
 * sistem pelacak pelamar tetap menyingkirkannya. Menyembunyikan informasi ini
 * membuat laporan terlihat bersih tapi merugikan pengguna diam-diam.
 *
 * Kenapa bukan gap: menuduh orang tidak bisa HTML itu salah secara faktual.
 * Kenapa bukan suggestion biasa: aksinya 5 detik dan dampaknya rendah \u2014 kalau
 * ikut memakan jatah MODE_MAX_SUGGESTIONS, ia akan menggeser saran berdampak
 * tinggi. Karena itu kuotanya sendiri, di luar daftar saran.
 *
 * `evidence` WAJIB terisi: kalimatnya harus selalu menyebut dasarnya ("lewat
 * React & SvelteKit") supaya terasa membela, bukan menuduh.
 */
export const keywordGapSchema = z.object({
  skill: z.string(),
  confidence: z.enum(["certain", "likely"]).default("certain"),
  evidence: z.array(z.string()).default([]),
  severity: z.enum(["must", "nice"]).default("must"),
})

export type KeywordGap = z.infer<typeof keywordGapSchema>

/** Bagian CV yang boleh disentuh saran \u2014 enum supaya UI bisa mengelompokkan. */
export const SUGGESTION_SECTIONS = [
  "summary",
  "experience",
  "projects",
  "skills",
  "education",
  "achievements",
  "other",
] as const
export type SuggestionSection = (typeof SUGGESTION_SECTIONS)[number]

/**
 * Jenis perubahan yang diklaim saran (engine v3).
 * Dipakai guardrail untuk MEMVERIFIKASI klaim itu (mis. "added_metric" wajib
 * benar-benar memunculkan angka baru), menggantikan aturan anti-kosmetik lama
 * yang justru mendorong keyword stuffing.
 */
export const SUGGESTION_CHANGE_KINDS = [
  "added_metric",
  "added_scope",
  "added_tool",
  "added_outcome",
  "reordered_for_relevance",
] as const
export type SuggestionChangeKind = (typeof SUGGESTION_CHANGE_KINDS)[number]

export const SUGGESTION_IMPACTS = ["high", "medium", "low"] as const
export type SuggestionImpact = (typeof SUGGESTION_IMPACTS)[number]

/**
 * Saran tulis ulang (v3) \u2014 schema MENGIKAT apa yang prompt cuma bisa memohon:
 * - basedOnFacts: fakta CV yang dirujuk (guardrail kejujuran).
 * - targetRequirement: requirement lowongan yang dijawab (guardrail relevansi).
 * - addressesGap: menghubungkan saran ke gap hasil diagnosis (anti saran yatim).
 * - whatChanged: klaim perubahan yang bisa DIVERIFIKASI kode.
 * - impact: dipakai untuk mengurutkan saran paling berdampak lebih dulu.
 *
 * Catatan kompatibilitas: field baru memakai default supaya analisis lama yang
 * tersimpan di DB/Redis tetap bisa di-parse.
 */
export const suggestionSchema = z.object({
  section: z.enum(SUGGESTION_SECTIONS).catch("other"),
  before: z.string(),
  after: z.string(),
  basedOnFacts: z.array(z.string()).min(1),
  targetRequirement: z.string().default(""),
  addressesGap: z.string().default(""),
  whatChanged: z.array(z.enum(SUGGESTION_CHANGE_KINDS)).default([]),
  rationale: z.string().default(""),
  impact: z.enum(SUGGESTION_IMPACTS).default("medium"),
})

export const suggestionsSchema = z.object({
  suggestions: z.array(suggestionSchema).default([]),
})

/**
 * Laporan analisis GABUNGAN (engine v2): gaps + suggestions + careerNote lahir
 * dari SATU panggilan LLM \u2014 satu rantai pemikiran, tidak bisa saling bertentangan,
 * dan lebih hemat token (1x kirim CV+lowongan).
 */
export const analysisReportSchema = z.object({
  gaps: z.array(gapSchema).default([]),
  suggestions: z.array(suggestionSchema).default([]),
  careerNote: z.string().default(""),
})

export type SemanticScore = z.infer<typeof semanticScoreSchema>
export type Gap = z.infer<typeof gapSchema>
export type Suggestion = z.infer<typeof suggestionSchema>
export type AnalysisReport = z.infer<typeof analysisReportSchema>

export type AnalysisResult = {
  matchScore: number
  ruleScore: number
  semanticScore: number | null
  mode: SuggestionMode
  gaps: Gap[]
  suggestions: Suggestion[]
  rejectedSuggestions: Array<{ suggestion: Suggestion; reason: string }>
  careerNote: string
  language: string
  engineVersion: string
  /** Versi prompt yang menghasilkan laporan ini \u2014 bahan utama evaluasi A/B. */
  promptVersion: string
  /**
   * Kata kunci yang jelas dikuasai tapi belum tertulis di CV.
   * OPSIONAL dengan sengaja: analisis lama yang tersimpan di DB/Redis tidak
   * punya field ini, dan pemanggil yang menyusun AnalysisResult secara literal
   * tidak ikut rusak saat field ini ditambahkan.
   */
  keywordGaps?: KeywordGap[]
}

export const runAnalysisSchema = z.object({
  cvId: z.string().min(1),
  jobPostingId: z.string().min(1),
})
