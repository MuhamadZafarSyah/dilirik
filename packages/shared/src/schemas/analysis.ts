import { z } from "zod"

/** Skor semantic dari AI (digabung dengan rule-based). */
export const semanticScoreSchema = z.object({
  score: z.number().min(0).max(100),
  reasoning: z.string().max(600),
  matchedPairs: z
    .array(z.object({ jobSkill: z.string(), cvEvidence: z.string() }))
    .default([]),
})

/** Gap: "real" = gap beneran (skill tidak ada), "presentation" = ada tapi tak terlihat. */
export const gapSchema = z.object({
  type: z.enum(["real", "presentation"]),
  skill: z.string(),
  explanation: z.string(),
  advice: z.string(),
})

export const gapsSchema = z.object({ gaps: z.array(gapSchema).default([]) })

/** Saran tulis ulang — WAJIB merujuk fakta yang ada di CV (guardrail titik-3). */
export const suggestionSchema = z.object({
  section: z.string(),
  before: z.string(),
  after: z.string(),
  basedOnFacts: z.array(z.string()).min(1),
})

export const suggestionsSchema = z.object({
  suggestions: z.array(suggestionSchema).default([]),
})

export type SemanticScore = z.infer<typeof semanticScoreSchema>
export type Gap = z.infer<typeof gapSchema>
export type Suggestion = z.infer<typeof suggestionSchema>

export type AnalysisResult = {
  matchScore: number
  ruleScore: number
  semanticScore: number | null
  gaps: Gap[]
  suggestions: Suggestion[]
  rejectedSuggestions: Array<{ suggestion: Suggestion; reason: string }>
  language: string
  engineVersion: string
}

export const runAnalysisSchema = z.object({
  cvId: z.string().min(1),
  jobPostingId: z.string().min(1),
})
