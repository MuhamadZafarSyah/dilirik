/**
 * Kontrak provider lowongan (PRD Cari Lowongan §8.2).
 *
 * Dua bentuk sumber yang sengaja dibedakan:
 * - `aggregator` — dicari dengan kata kunci (Jooble, Adzuna, JSearch).
 * - `ats`        — ditarik per PERUSAHAAN dari halaman karier resmi. Tanpa API
 *   key, tanpa kuota, dan datanya paling terstruktur. Ini tulang belakang indeks.
 */

export type JobProviderKind = "ats" | "aggregator"

export type RemoteType = "remote" | "hybrid" | "onsite"

/** Lowongan apa adanya dari sumber — belum dinormalisasi, belum di-dedupe. */
export type RawJob = {
  providerId: string
  /** Nama sumber yang ditampilkan ke user, mis. "Halaman karier Gojek (Greenhouse)". */
  sourceDisplayName: string
  externalId: string
  title: string
  company: string
  location?: string | null
  remoteType?: RemoteType | null
  description?: string | null
  salaryMin?: number | null
  salaryMax?: number | null
  currency?: string | null
  salaryPeriod?: string | null
  postedAt?: string | null
  validThrough?: string | null
  applyUrl: string
  sourceUrl: string
}

export type JobQuery = {
  keywords: string[]
  location?: string | null
  remoteOnly?: boolean
  postedWithinDays?: number
  page?: number
}

export type ProviderRunStatus = "OK" | "DISABLED" | "ERROR" | "BUDGET_EXHAUSTED"

export type ProviderRunResult = {
  providerId: string
  status: ProviderRunStatus
  calls: number
  jobs: RawJob[]
  errorMsg?: string
}

export type JobProvider = {
  id: string
  displayName: string
  kind: JobProviderKind
  /** 0 untuk ATS — gratis dan tanpa kuota. */
  costPerCall: number
  /** 0 = tanpa batas harian. */
  dailyCallBudget: number
  /**
   * Env kosong = provider MATI, bukan crash. Mengikuti pola R2/Gotenberg/Adobe
   * yang sudah ada di codebase (dan sengaja TIDAK mengulang pola throw di getLlm).
   */
  isEnabled(): boolean
  search(query: JobQuery): Promise<RawJob[]>
}

/** Perusahaan pada daftar kurasi "Direkomendasikan Dilirik". */
export type AtsCompanyRef = {
  name: string
  atsProvider: string
  atsSlug: string
}

export type AtsConnector = {
  id: string
  /** Label sumber di kartu hasil — selalu menyebut halaman karier + nama ATS. */
  displayName(companyName: string): string
  fetchJobs(company: AtsCompanyRef): Promise<RawJob[]>
}

/**
 * Prioritas sumber saat merge duplikat (PRD §12.2):
 * halaman karier/ATS > portal via agregator > agregator generik.
 */
export function sourcePriority(providerId: string): number {
  if (providerId.startsWith("ats:")) return 3
  if (providerId === "jooble" || providerId === "adzuna") return 2
  return 1
}
