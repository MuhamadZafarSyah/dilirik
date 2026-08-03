import type { CvStructured, JobParsed } from "@dilirik/shared"
import { normalize } from "../guardrail/postCheck"
import { expandSkill, isShortToken } from "./skillAliases"

const MUST_WEIGHT = 3
const NICE_WEIGHT = 1

/** Bersihkan tanda baca yang menempel di tepi token ("react," → "react"). */
const TRIM_EDGE = /^[.\-/]+|[.\-/]+$/g

type CorpusIndex = { tokens: Set<string>; text: string }

function buildIndex(entries: string[]): CorpusIndex {
  const tokens = new Set<string>()
  const parts: string[] = []
  for (const entry of entries) {
    const normalized = normalize(entry)
    if (!normalized) continue
    parts.push(` ${normalized} `)
    for (const raw of normalized.split(" ")) {
      const token = raw.replace(TRIM_EDGE, "")
      if (token) tokens.add(token)
    }
  }
  return { tokens, text: parts.join("|") }
}

function matches(variant: string, index: CorpusIndex): boolean {
  if (variant.includes(" ")) return index.text.includes(` ${variant} `)
  return index.tokens.has(variant.replace(TRIM_EDGE, "")) || index.text.includes(` ${variant} `)
}

/**
 * Cek apakah sebuah skill lowongan benar-benar tercakup di CV.
 *
 * Engine v3 — pencocokan TOKEN/FRASA UTUH + peta alias, bukan substring dua arah:
 * - "Java" TIDAK lagi tercakup oleh "JavaScript".
 * - "R", "Go", "C", "AI" (token ≤ 2 karakter) hanya dicari di daftar skill
 *   eksplisit (`skillOnlyCorpus`), tidak di kalimat bebas seperti "go to market".
 * - Kemiripan yang sah ("JS" ↔ "JavaScript") ditangani `skillAliases.ts`.
 */
export function skillCovered(
  jobSkill: string,
  cvCorpus: string[],
  skillOnlyCorpus?: string[],
): boolean {
  const needle = normalize(jobSkill)
  if (!needle) return false
  const wide = buildIndex(cvCorpus)
  const strict = skillOnlyCorpus ? buildIndex(skillOnlyCorpus) : wide
  return expandSkill(needle).some((variant) =>
    matches(variant, isShortToken(variant) ? strict : wide),
  )
}

/**
 * Scoring rule-based deterministik (PRD §8.3a).
 * Bobot skill wajib (3x) > opsional (1x) → persen 0–100.
 * Korpus mencakup SELURUH isi structured CV, termasuk about & section dinamis
 * (Bahasa, Sertifikasi, dll) sehingga semuanya ikut jadi bahan analisis.
 */
export function ruleBasedScore(cv: CvStructured, job: JobParsed): {
  score: number
  matchedMust: string[]
  missingMust: string[]
  matchedNice: string[]
  missingNice: string[]
} {
  // Korpus "ketat": tempat skill dideklarasikan secara eksplisit.
  const skillCorpus = [
    ...cv.skills,
    ...(cv.sections ?? []).flatMap((s) => [s.label, ...s.items]),
  ].filter(Boolean)

  // Korpus "luas": seluruh jejak tekstual CV.
  const corpus = [
    ...skillCorpus,
    ...cv.experiences.flatMap((e) => [e.title, ...(e.highlights ?? [])]),
    ...cv.achievements,
    cv.headline ?? "",
    cv.about ?? "",
  ].filter(Boolean)

  const matchedMust: string[] = []
  const missingMust: string[] = []
  for (const skill of job.mustHaveSkills) {
    ;(skillCovered(skill, corpus, skillCorpus) ? matchedMust : missingMust).push(skill)
  }
  const matchedNice: string[] = []
  const missingNice: string[] = []
  for (const skill of job.niceToHaveSkills) {
    ;(skillCovered(skill, corpus, skillCorpus) ? matchedNice : missingNice).push(skill)
  }

  const totalWeight =
    job.mustHaveSkills.length * MUST_WEIGHT + job.niceToHaveSkills.length * NICE_WEIGHT
  if (totalWeight === 0) {
    // Tidak ada skill terdeteksi di lowongan → netral 50 agar tidak menyesatkan
    return { score: 50, matchedMust, missingMust, matchedNice, missingNice }
  }
  const gained = matchedMust.length * MUST_WEIGHT + matchedNice.length * NICE_WEIGHT
  const score = Math.round((gained / totalWeight) * 100)
  return {
    score: Math.max(0, Math.min(100, score)),
    matchedMust,
    missingMust,
    matchedNice,
    missingNice,
  }
}
