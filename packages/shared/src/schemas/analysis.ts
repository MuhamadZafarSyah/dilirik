import { z } from "zod"

/** Skor semantic dari AI (digabung dengan rule-based). */
export const semanticScoreSchema = z.object({
  score: z.number().min(0).max(100),
  reasoning: z.string().max(600),
  matchedPairs: z
    .array(z.object({ jobSkill: z.string(), cvEvidence: z.string() }))
    .default([]),
})

/** Mode strategi saran — dipilih DETERMINISTIK di kode dari coverage must-have (bukan oleh LLM). */
export const SUGGESTION_MODES = ["optimize", "reframe", "honest_pivot"] as const
export type SuggestionMode = (typeof SUGGESTION_MODES)[number]

/**
 * Gap — taksonomi penuh (engine v2):
 * - type: "real" = tidak ada jejaknya di CV; "presentation" = ada tapi tak terlihat.
 * - severity: "must" = dari requirement wajib; "nice" = nice-to-have.
 * - fixability:
 *   - "fixable_by_editing": faktanya ADA di CV, tinggal disajikan → hanya jenis ini yang boleh melahirkan saran revisi.
 *   - "requires_experience": jujur — butuh pengalaman/belajar nyata, tidak bisa ditambal tulisan.
 *   - "fit_constraint": faktor kecocokan non-skill (atribut personal/lokasi/identitas) — informasi netral, bukan bahan saran.
 */
export const gapSchema = z.object({
  type: z.enum(["real", "presentation"]),
  skill: z.string(),
  explanation: z.string(),
  advice: z.string(),
  severity: z.enum(["must", "nice"]).default("must"),
  fixability: z
    .enum(["fixable_by_editing", "requires_experience", "fit_constraint"])
    .default("requires_experience"),
})

export const gapsSchema = z.object({ gaps: z.array(gapSchema).default([]) })

/** Bagian CV yang boleh disentuh saran — enum supaya UI bisa mengelompokkan. */
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
 * Saran tulis ulang (v3) — schema MENGIKAT apa yang prompt cuma bisa memohon:
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
 * dari SATU panggilan LLM — satu rantai pemikiran, tidak bisa saling bertentangan,
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
  /** Versi prompt yang menghasilkan laporan ini — bahan utama evaluasi A/B. */
  promptVersion: string
}

export const runAnalysisSchema = z.object({
  cvId: z.string().min(1),
  jobPostingId: z.string().min(1),
})
