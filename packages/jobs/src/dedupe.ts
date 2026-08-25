import { createHash } from "node:crypto"
import type { NormalizedJob } from "./normalize.js"
import { sourcePriority } from "./providers/types.js"

/**
 * Deduplikasi lintas sumber (PRD Cari Lowongan §12.2).
 *
 * Satu lowongan yang sama bisa muncul dari halaman karier perusahaan DAN dari
 * dua agregator sekaligus. Menampilkannya tiga kali adalah cara tercepat membuat
 * hasil pencarian terasa seperti sampah, jadi dedupe di sini bukan optimasi —
 * ini syarat kelayakan fitur.
 *
 * Dua lapis:
 * 1. Fingerprint keras (hash) untuk pasangan yang identik setelah normalisasi.
 * 2. Kemiripan shingle Jaccard untuk judul/perusahaan yang beda tipis.
 */

export type MergedJob = NormalizedJob & {
  fingerprint: string
  /** Semua sumber yang melaporkan lowongan ini — semuanya ditampilkan ke user. */
  sources: Array<{
    providerId: string
    displayName: string
    url: string
    applyUrl: string
    postedAt: string | null
  }>
  primarySource: string
}

const SIMILARITY_THRESHOLD = 0.85

/** Minggu ISO dari tanggal posting — toleransi wajar untuk repost mingguan. */
export function weekOf(postedAt: string | null | undefined): string {
  if (!postedAt) return "unknown"
  const date = new Date(postedAt)
  if (Number.isNaN(date.getTime())) return "unknown"
  const monday = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  )
  const day = monday.getUTCDay() || 7
  monday.setUTCDate(monday.getUTCDate() - (day - 1))
  return monday.toISOString().slice(0, 10)
}

export function fingerprintOf(job: NormalizedJob): string {
  const parts = [
    job.companyNorm,
    job.titleNorm,
    job.city?.toLowerCase() ?? job.locationNorm ?? "unknown",
    weekOf(job.postedAt),
  ]
  return createHash("sha256").update(parts.join("|")).digest("hex")
}

export function shingles(input: string, size = 3): Set<string> {
  const value = input.replace(/\s+/g, " ").trim()
  const result = new Set<string>()
  if (value.length <= size) {
    if (value) result.add(value)
    return result
  }
  for (let i = 0; i + size <= value.length; i++) result.add(value.slice(i, i + size))
  return result
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let intersection = 0
  for (const item of a) if (b.has(item)) intersection++
  return intersection / (a.size + b.size - intersection)
}

export function isLikelySameJob(a: NormalizedJob, b: NormalizedJob): boolean {
  if (a.companyNorm !== b.companyNorm) {
    if (jaccard(shingles(a.companyNorm), shingles(b.companyNorm)) < SIMILARITY_THRESHOLD) {
      return false
    }
  }
  const sameCity = (a.city ?? a.locationNorm) === (b.city ?? b.locationNorm)
  const titleScore = jaccard(shingles(a.titleNorm), shingles(b.titleNorm))
  return titleScore >= SIMILARITY_THRESHOLD && (sameCity || !a.city || !b.city)
}

function toSourceEntry(job: NormalizedJob) {
  return {
    providerId: job.providerId,
    displayName: job.sourceDisplayName,
    url: job.sourceUrl,
    applyUrl: job.applyUrl,
    postedAt: job.postedAt ?? null,
  }
}

/**
 * Gabungkan dua lowongan yang dianggap sama. Field diambil dari sumber dengan
 * prioritas lebih tinggi; field yang kosong di pemenang diisi dari yang kalah
 * supaya informasi tidak hilang hanya karena kalah prioritas.
 */
export function mergeJobs(current: MergedJob, incoming: NormalizedJob): MergedJob {
  const incomingWins =
    sourcePriority(incoming.providerId) > sourcePriority(current.primarySource)

  const winner = incomingWins ? incoming : current
  const loser: NormalizedJob = incomingWins ? current : incoming

  const sources = [...current.sources]
  if (!sources.some((source) => source.providerId === incoming.providerId)) {
    sources.push(toSourceEntry(incoming))
  }
  sources.sort((a, b) => sourcePriority(b.providerId) - sourcePriority(a.providerId))

  const postedCandidates = [current.postedAt, incoming.postedAt].filter(
    (value): value is string => Boolean(value),
  )

  return {
    ...winner,
    location: winner.location ?? loser.location,
    city: winner.city ?? loser.city,
    locationNorm: winner.locationNorm ?? loser.locationNorm,
    remoteType: winner.remoteType ?? loser.remoteType,
    salaryMin: winner.salaryMin ?? loser.salaryMin,
    salaryMax: winner.salaryMax ?? loser.salaryMax,
    currency: winner.currency ?? loser.currency,
    salaryPeriod: winner.salaryPeriod ?? loser.salaryPeriod,
    descriptionSnippet:
      winner.descriptionSnippet.length >= loser.descriptionSnippet.length
        ? winner.descriptionSnippet
        : loser.descriptionSnippet,
    skillTerms: [...new Set([...winner.skillTerms, ...loser.skillTerms])],
    // Tanggal posting paling awal = kapan lowongan benar-benar dibuka.
    postedAt:
      postedCandidates.length > 0
        ? postedCandidates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0]!
        : null,
    fingerprint: current.fingerprint,
    sources,
    primarySource: sources[0]?.providerId ?? current.primarySource,
  }
}

export function dedupeJobs(jobs: NormalizedJob[]): MergedJob[] {
  const byFingerprint = new Map<string, MergedJob>()
  const byCompany = new Map<string, string[]>()

  for (const job of jobs) {
    const fingerprint = fingerprintOf(job)
    const existing = byFingerprint.get(fingerprint)
    if (existing) {
      byFingerprint.set(fingerprint, mergeJobs(existing, job))
      continue
    }

    // Lapis kedua: cari kandidat mirip dalam perusahaan yang sama saja.
    const siblings = byCompany.get(job.companyNorm) ?? []
    const similar = siblings
      .map((key) => byFingerprint.get(key))
      .find((candidate) => candidate && isLikelySameJob(candidate, job))

    if (similar) {
      byFingerprint.set(similar.fingerprint, mergeJobs(similar, job))
      continue
    }

    byFingerprint.set(fingerprint, {
      ...job,
      fingerprint,
      sources: [toSourceEntry(job)],
      primarySource: job.providerId,
    })
    byCompany.set(job.companyNorm, [...siblings, fingerprint])
  }

  return [...byFingerprint.values()]
}
