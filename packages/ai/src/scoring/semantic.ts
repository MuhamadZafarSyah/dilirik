import { semanticScoreSchema, type CvStructured, type JobParsed, type SemanticScore } from "@dilirik/shared"
import { generateStructured } from "../generateStructured"
import { HONESTY_SYSTEM_PROMPT, languageInstruction } from "../guardrail/systemPrompt"

/**
 * Scoring semantic (PRD §8.3b): menilai kecocokan MAKNA (mis. "React" ≈ "Next.js",
 * "jualan" ≈ "sales"). Kalau output invalid → caller fallback ke rule-based.
 *
 * Engine v3: `reasoning` kini ikut bahasa CV (sebelumnya satu-satunya keluaran
 * AI yang melewatkan languageInstruction) dan temperature 0 supaya skor untuk
 * input yang sama tidak goyang antar-pemanggilan.
 */
export async function semanticScore(
  cv: CvStructured,
  job: JobParsed,
  language = "id",
): Promise<SemanticScore> {
  return generateStructured({
    schema: semanticScoreSchema,
    temperature: 0,
    system: [
      HONESTY_SYSTEM_PROMPT,
      languageInstruction(language),
      "Kamu menilai kecocokan CV terhadap lowongan secara semantik. Nilai 0-100. Pertimbangkan skill yang mirip makna/ekosistem sebagai cocok sebagian.",
      "Kemiripan NAMA bukan kemiripan makna: Java bukan JavaScript, dan menyebut sebuah tools di kalimat lain tidak sama dengan menguasainya.",
    ].join("\n"),
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
