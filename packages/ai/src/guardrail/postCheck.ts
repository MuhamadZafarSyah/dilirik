import type { CvStructured, Suggestion } from "@dilirik/shared"

/** Normalisasi string untuk pencocokan fakta yang toleran. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s+#./-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** Kumpulkan seluruh fakta tekstual dari structuredJson CV. */
export function collectCvFacts(cv: CvStructured): string[] {
  const facts: string[] = [...cv.skills, ...cv.achievements]
  if (cv.fullName) facts.push(cv.fullName)
  if (cv.headline) facts.push(cv.headline)
  for (const exp of cv.experiences) {
    facts.push(exp.title)
    if (exp.company) facts.push(exp.company)
    facts.push(...exp.highlights)
  }
  for (const edu of cv.education) {
    facts.push(edu.institution)
    if (edu.degree) facts.push(edu.degree)
  }
  return facts.map(normalize).filter(Boolean)
}

export type PostCheckResult =
  | { ok: true }
  | { ok: false; reason: string }

/**
 * Guardrail titik-3 (PRD §8): setiap saran tulis-ulang WAJIB merujuk fakta
 * yang benar-benar ada di structuredJson CV.
 * - Setiap entri `basedOnFacts` harus ditemukan (substring, ternormalisasi)
 *   di kumpulan fakta CV.
 * - Jika saran menyebut fakta yang tidak ada → TOLAK (caller menandainya
 *   sebagai gap beneran / membuangnya).
 */
export function postCheckSuggestion(
  suggestion: Suggestion,
  cv: CvStructured,
): PostCheckResult {
  const facts = collectCvFacts(cv)
  const haystack = facts.join(" | ")
  if (suggestion.basedOnFacts.length === 0) {
    return { ok: false, reason: "Saran tidak merujuk fakta CV manapun" }
  }
  for (const claimed of suggestion.basedOnFacts) {
    const needle = normalize(claimed)
    if (!needle) return { ok: false, reason: "Fakta rujukan kosong" }
    const found =
      haystack.includes(needle) ||
      facts.some((f) => f.includes(needle) || needle.includes(f))
    if (!found) {
      return {
        ok: false,
        reason: `Fakta "${claimed}" tidak ditemukan di CV — kemungkinan halusinasi`,
      }
    }
  }
  return { ok: true }
}
