import type { CvStructured, JobParsed, Suggestion } from "@dilirik/shared"

/** Normalisasi string untuk pencocokan fakta yang toleran. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s+#./-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** Kumpulkan seluruh fakta tekstual dari structuredJson CV (termasuk about & section dinamis). */
export function collectCvFacts(cv: CvStructured): string[] {
  const facts: string[] = [...cv.skills, ...cv.achievements]
  if (cv.fullName) facts.push(cv.fullName)
  if (cv.headline) facts.push(cv.headline)
  if (cv.about) facts.push(cv.about)
  for (const exp of cv.experiences) {
    facts.push(exp.title)
    if (exp.company) facts.push(exp.company)
    facts.push(...exp.highlights)
  }
  for (const edu of cv.education) {
    facts.push(edu.institution)
    if (edu.degree) facts.push(edu.degree)
  }
  for (const section of cv.sections ?? []) {
    facts.push(section.label)
    facts.push(...section.items)
  }
  return facts.map(normalize).filter(Boolean)
}

/** Kumpulkan seluruh istilah lowongan (untuk guardrail relevansi & anti-kosmetik). */
export function collectJobTerms(job: JobParsed): string[] {
  return [
    job.jobTitle ?? "",
    job.company ?? "",
    job.level ?? "",
    ...job.mustHaveSkills,
    ...job.niceToHaveSkills,
    ...job.requirements,
    ...job.keywords,
  ]
    .map(normalize)
    .filter(Boolean)
}

export type PostCheckResult =
  | { ok: true }
  | { ok: false; reason: string }

/**
 * Guardrail titik-3 / KEJUJURAN (PRD §8): setiap saran WAJIB merujuk fakta
 * yang benar-benar ada di structuredJson CV.
 * - Setiap entri `basedOnFacts` harus ditemukan (substring, ternormalisasi).
 * - Fakta yang tidak ada → TOLAK (transparan, masuk daftar rejected).
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

/**
 * Guardrail KEBERGUNAAN (engine v2) — kejujuran saja tidak cukup; saran juga
 * harus RELEVAN terhadap lowongan. Menolak tiga penyakit yang lolos guardrail lama:
 * 1. No-op: `after` ≈ `before` (cuma tambah 2-3 kata kosong).
 * 2. Tanpa target: saran tidak menjawab requirement lowongan mana pun
 *    (membunuh fluff macam "Highly skilled engineer" untuk lowongan lain bidang).
 * 3. Kosmetik: kata-kata baru di `after` tidak menyentuh satu pun istilah
 *    lowongan → cuma parafrase/sinonim, tidak menambah relevansi.
 */
export function postCheckUsefulness(
  suggestion: Suggestion,
  job: JobParsed,
): PostCheckResult {
  const before = normalize(suggestion.before)
  const after = normalize(suggestion.after)
  if (!after || after === before) {
    return { ok: false, reason: "No-op — hasil tulis ulang sama saja dengan teks asli" }
  }

  const jobTerms = collectJobTerms(job)
  const jobText = jobTerms.join(" | ")

  const target = normalize(suggestion.targetRequirement ?? "")
  if (!target) {
    return { ok: false, reason: "Saran tidak menyebut requirement lowongan yang dijawab (targetRequirement kosong)" }
  }
  const targetTokens = target.split(" ").filter((tok) => tok.length >= 3)
  const targetLinked =
    targetTokens.length === 0 || targetTokens.some((tok) => jobText.includes(tok))
  if (!targetLinked) {
    return {
      ok: false,
      reason: `targetRequirement "${suggestion.targetRequirement}" tidak ditemukan di lowongan`,
    }
  }

  // Anti-kosmetik: kata baru yang ditambahkan harus menyentuh istilah lowongan.
  const beforeTokens = new Set(before.split(" "))
  const addedTokens = after.split(" ").filter((tok) => tok.length >= 3 && !beforeTokens.has(tok))
  if (addedTokens.length > 0 && !addedTokens.some((tok) => jobText.includes(tok))) {
    return {
      ok: false,
      reason: "Perubahan kosmetik — tidak menambah satu pun istilah yang relevan dengan lowongan",
    }
  }
  return { ok: true }
}
