import { cvStructuredSchema, type CvStructured } from "@dilirik/shared"
import { generateStructured } from "../generateStructured"
import { HONESTY_SYSTEM_PROMPT } from "../guardrail/systemPrompt"

/** Parse CV mentah → structuredJson (PRD §7.2). Tidak menambah info apapun. */
export async function parseCv(rawText: string): Promise<CvStructured> {
  return generateStructured({
    schema: cvStructuredSchema,
    system: `${HONESTY_SYSTEM_PROMPT}\nEkstrak struktur dari teks CV APA ADANYA. Jangan menambah, menebak, atau memperindah. Field yang tidak ada biarkan kosong/null.`,
    prompt: `## Teks CV\n${rawText}`,
  })
}
