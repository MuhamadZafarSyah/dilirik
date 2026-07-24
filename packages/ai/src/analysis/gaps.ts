import { gapsSchema, type CvStructured, type Gap, type JobParsed } from "@dilirik/shared"
import { generateStructured } from "../generateStructured"
import { HONESTY_SYSTEM_PROMPT, languageInstruction } from "../guardrail/systemPrompt"

/**
 * Analisis gap (PRD §8.4) — dua jenis:
 * - "real": skill benar-benar tidak ada → saran jujur (belajar, proyek kecil, dsb).
 * - "presentation": dimiliki tapi tidak terlihat → saran memunculkan fakta.
 */
export async function analyzeGaps(args: {
  cv: CvStructured
  job: JobParsed
  missingMust: string[]
  missingNice: string[]
  language: string
}): Promise<Gap[]> {
  const { cv, job, missingMust, missingNice, language } = args
  const result = await generateStructured({
    schema: gapsSchema,
    system: `${HONESTY_SYSTEM_PROMPT}\n${languageInstruction(language)}\nKlasifikasikan tiap gap: "real" jika benar-benar tidak ada jejaknya di CV; "presentation" jika sebenarnya ada fakta terkait di CV tapi tidak tersaji jelas.`,
    prompt: [
      "## CV (structured JSON)",
      JSON.stringify(cv),
      "## Lowongan (parsed JSON)",
      JSON.stringify(job),
      "## Kandidat gap dari rule-based (skill lowongan yang tidak terdeteksi di CV)",
      JSON.stringify({ missingMust, missingNice }),
      "Untuk tiap gap: type, skill, explanation (kenapa dianggap gap), advice (langkah konkret & jujur).",
    ].join("\n"),
  })
  return result.gaps
}
