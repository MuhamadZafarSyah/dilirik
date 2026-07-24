import { suggestionsSchema, type CvStructured, type JobParsed, type Suggestion } from "@dilirik/shared"
import { generateStructured } from "../generateStructured"
import { HONESTY_SYSTEM_PROMPT, languageInstruction } from "../guardrail/systemPrompt"
import { postCheckSuggestion } from "../guardrail/postCheck"

export type SuggestionOutcome = {
  accepted: Suggestion[]
  rejected: Array<{ suggestion: Suggestion; reason: string }>
}

/**
 * Saran tulis ulang (PRD §8.5) — hanya dari fakta yang ada, dalam BAHASA CV.
 * `before` WAJIB kutipan verbatim dari teks CV asli supaya bisa diganti
 * otomatis di step revisi (timpa teks CV → versi baru).
 * Setiap saran lalu melewati guardrail titik-3 (post-check fakta);
 * yang gagal DIBUANG ke daftar rejected (transparan, tidak diam-diam).
 */
export async function generateSuggestions(args: {
  cv: CvStructured
  job: JobParsed
  rawText: string
  language: string
}): Promise<SuggestionOutcome> {
  const { cv, job, rawText, language } = args
  const result = await generateStructured({
    schema: suggestionsSchema,
    system: `${HONESTY_SYSTEM_PROMPT}\n${languageInstruction(language)}\nBuat saran tulis ulang bullet/kalimat CV agar lebih menonjol untuk lowongan ini. WAJIB: (1) basedOnFacts berisi kutipan fakta ASLI dari CV yang mendasari saran; (2) before adalah KUTIPAN VERBATIM dari \"Teks CV asli\" di bawah — persis karakter demi karakter termasuk tanda baca & kapitalisasi — agar aplikasi bisa menggantinya otomatis.`,
    prompt: [
      "## Teks CV asli (sumber kutipan `before` — verbatim)",
      rawText,
      "## CV (structured JSON)",
      JSON.stringify(cv),
      "## Lowongan (parsed JSON)",
      JSON.stringify(job),
      "Buat maks 6 saran paling berdampak. before = kutipan verbatim dari teks CV asli, after = versi lebih menonjol (fakta sama, TANPA menambah pengalaman/skill baru).",
    ].join("\n"),
  })

  const accepted: Suggestion[] = []
  const rejected: SuggestionOutcome["rejected"] = []
  for (const suggestion of result.suggestions) {
    const check = postCheckSuggestion(suggestion, cv)
    if (check.ok) accepted.push(suggestion)
    else rejected.push({ suggestion, reason: check.reason })
  }
  return { accepted, rejected }
}
