import type { CvStructured, JobParsed } from "@dilirik/shared"
import { normalize } from "../guardrail/postCheck"

const MUST_WEIGHT = 3
const NICE_WEIGHT = 1

/** Cek apakah sebuah skill lowongan "tercakup" di teks CV (token-aware). */
export function skillCovered(jobSkill: string, cvCorpus: string[]): boolean {
  const needle = normalize(jobSkill)
  if (!needle) return false
  return cvCorpus.some((entry) => entry.includes(needle) || needle.includes(entry))
}

/**
 * Scoring rule-based deterministik (PRD §8.3a).
 * Bobot skill wajib (3x) > opsional (1x) → persen 0–100.
 * Dipakai sebagai fallback & sanity-check untuk skor semantic.
 */
export function ruleBasedScore(cv: CvStructured, job: JobParsed): {
  score: number
  matchedMust: string[]
  missingMust: string[]
  matchedNice: string[]
  missingNice: string[]
} {
  const corpus = [
    ...cv.skills,
    ...cv.experiences.flatMap((e) => [e.title, ...(e.highlights ?? [])]),
    ...cv.achievements,
    cv.headline ?? "",
  ]
    .map(normalize)
    .filter(Boolean)

  const matchedMust: string[] = []
  const missingMust: string[] = []
  for (const skill of job.mustHaveSkills) {
    ;(skillCovered(skill, corpus) ? matchedMust : missingMust).push(skill)
  }
  const matchedNice: string[] = []
  const missingNice: string[] = []
  for (const skill of job.niceToHaveSkills) {
    ;(skillCovered(skill, corpus) ? matchedNice : missingNice).push(skill)
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
