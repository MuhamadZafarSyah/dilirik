import { semanticScoreSchema, type CvStructured, type JobParsed, type SemanticScore } from "@dilirik/shared"
import { generateStructured } from "../generateStructured"
import { HONESTY_SYSTEM_PROMPT } from "../guardrail/systemPrompt"

/**
 * Scoring semantic (PRD §8.3b): menilai kecocokan MAKNA (mis. "React" ≈ "Next.js",
 * "jualan" ≈ "sales"). Kalau output invalid → caller fallback ke rule-based.
 */
export async function semanticScore(
  cv: CvStructured,
  job: JobParsed,
): Promise<SemanticScore> {
  return generateStructured({
    schema: semanticScoreSchema,
    system: `${HONESTY_SYSTEM_PROMPT}\nKamu menilai kecocokan CV terhadap lowongan secara semantik. Nilai 0-100. Pertimbangkan skill yang mirip makna/ekosistem sebagai cocok sebagian.`,
    prompt: [
      "## CV (structured JSON)",
      JSON.stringify(cv),
      "## Lowongan (parsed JSON)",
      JSON.stringify(job),
      "Berikan: score (0-100), reasoning singkat, matchedPairs (skill lowongan ↔ bukti di CV).",
    ].join("\n"),
  })
}

/** Gabungan skor akhir: 60% semantic + 40% rule-based (di-clamp & dibulatkan). */
export function blendScores(ruleScore: number, semantic: number | null): number {
  if (semantic === null) return ruleScore
  return Math.max(0, Math.min(100, Math.round(semantic * 0.6 + ruleScore * 0.4)))
}
