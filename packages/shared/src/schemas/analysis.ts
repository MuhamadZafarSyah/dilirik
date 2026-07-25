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

/**
 * Saran tulis ulang — WAJIB merujuk fakta yang ada di CV (guardrail titik-3)
 * DAN menyebut requirement lowongan yang dijawab (guardrail relevansi, v2).
 */
export const suggestionSchema = z.object({
  section: z.string(),
  before: z.string(),
  after: z.string(),
  basedOnFacts: z.array(z.string()).min(1),
  targetRequirement: z.string().default(""),
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
}

export const runAnalysisSchema = z.object({
  cvId: z.string().min(1),
  jobPostingId: z.string().min(1),
})
