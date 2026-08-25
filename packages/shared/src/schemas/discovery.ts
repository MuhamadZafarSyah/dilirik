import { z } from "zod"

/* ============================================================
 * Konstanta — PRD "Cari Lowongan" (Job Discovery)
 * ============================================================ */

/** Kuota pencarian gratis per bulan (PRD §13.1). */
export const DEFAULT_DISCOVERY_QUOTA = 15

/** Jumlah rekomendasi "Wajib Coba" hasil kurasi AI (PRD §11.5). */
export const DISCOVERY_TOP_PICKS = 5

/** Kandidat yang dikirim ke LLM dalam SATU call batch (PRD §11.1). */
export const DISCOVERY_CURATION_INPUT = 20

/** Kandidat lain yang ditampilkan di bawah Top Picks. */
export const DISCOVERY_OTHER_CANDIDATES = 15

/** Batas kandidat yang diambil dari indeks lokal sebelum ranking. */
export const DISCOVERY_CANDIDATE_LIMIT = 300

/** Di bawah ambang ini filter dilonggarkan bertahap (lokasi → seniority). */
export const DISCOVERY_RELAX_THRESHOLD = 20

/** Versi prompt discovery — disimpan di JobDiscoveryRun agar kualitas terlacak. */
export const DISCOVERY_PROMPT_VERSION = "cari-lowongan-1.0.0"

/** Retensi indeks lowongan (hari) — dipurge di akhir tiap ingestion run. */
export const DISCOVERY_INDEX_RETENTION_DAYS = 30

/** Umur posting yang ditandai "mungkin sudah tutup" (PRD §12.4). */
export const DISCOVERY_STALE_DAYS = 30

/** Hanya SNIPPET yang disimpan — bukan salinan penuh deskripsi (PRD §3.2). */
export const DISCOVERY_SNIPPET_MAX_CHARS = 600

/** Perusahaan ATS dinonaktifkan otomatis setelah gagal sebanyak ini. */
export const DISCOVERY_ATS_FAIL_LIMIT = 7

export const REMOTE_PREFS = ["any", "remote", "hybrid", "onsite"] as const
export type RemotePref = (typeof REMOTE_PREFS)[number]

export const REMOTE_TYPES = ["remote", "hybrid", "onsite"] as const
export type RemoteType = (typeof REMOTE_TYPES)[number]

export const SENIORITY_LEVELS = ["entry", "mid", "senior", "lead"] as const
export type SeniorityLevel = (typeof SENIORITY_LEVELS)[number]

/** ATS dengan endpoint job board publik tanpa auth (PRD §7.2). */
export const ATS_PROVIDERS = [
  "greenhouse",
  "lever",
  "ashby",
  "workable",
  "recruitee",
] as const
export type AtsProvider = (typeof ATS_PROVIDERS)[number]

export const DISCOVERY_RUN_STATUSES = ["DONE", "PARTIAL", "EMPTY", "FAILED"] as const
export type DiscoveryRunStatus = (typeof DISCOVERY_RUN_STATUSES)[number]

export const JOB_MATCH_STATUSES = ["NEW", "SAVED", "DISMISSED", "ANALYZED"] as const
export type JobMatchStatus = (typeof JOB_MATCH_STATUSES)[number]

export const DISMISS_REASONS = [
  "wrong_location",
  "wrong_level",
  "wrong_field",
  "already_applied",
  "other",
] as const
export type DismissReason = (typeof DISMISS_REASONS)[number]

/* ============================================================
 * Input schemas
 * ============================================================ */

/** Koreksi profil pencarian oleh user — profil BUKAN black box (PRD §11.2). */
export const searchProfileOverridesSchema = z.object({
  roles: z.array(z.string().min(1).max(120)).max(8).optional(),
  skills: z.array(z.string().min(1).max(80)).max(12).optional(),
  locations: z.array(z.string().min(1).max(80)).max(8).optional(),
  industries: z.array(z.string().min(1).max(80)).max(8).optional(),
  remotePref: z.enum(REMOTE_PREFS).optional(),
  seniority: z.enum(SENIORITY_LEVELS).optional(),
  salaryMin: z.number().int().min(0).max(1_000_000_000).optional(),
})

export type SearchProfileOverrides = z.infer<typeof searchProfileOverridesSchema>

export const discoverySearchSchema = z.object({
  cvId: z.string().min(1, "cvId wajib diisi"),
  profileOverrides: searchProfileOverridesSchema.optional(),
  postedWithinDays: z.number().int().min(1).max(90).optional().default(30),
})

export type DiscoverySearchInput = z.infer<typeof discoverySearchSchema>

export const updateSearchProfileSchema = searchProfileOverridesSchema.refine(
  (value) => Object.keys(value).length > 0,
  { message: "Tidak ada perubahan profil yang dikirim" },
)

export type UpdateSearchProfileInput = z.infer<typeof updateSearchProfileSchema>

export const dismissJobMatchSchema = z.object({
  reason: z.enum(DISMISS_REASONS).optional().default("other"),
  note: z.string().max(300).optional(),
})

export type DismissJobMatchInput = z.infer<typeof dismissJobMatchSchema>

/** Minta dikabari lewat email begitu ada lowongan cocok (PRD US-07). */
export const createJobAlertSchema = z.object({
  pendingQueryId: z.string().min(1, "pendingQueryId wajib diisi"),
})

export type CreateJobAlertInput = z.infer<typeof createJobAlertSchema>

/** Payload trigger ingestion (dipanggil cron dengan secret header). */
export const ingestRequestSchema = z.object({
  trigger: z.enum(["cron", "manual"]).optional(),
  providers: z.array(z.string().min(1)).max(20).optional(),
  maxCompanies: z.number().int().min(1).max(2000).optional(),
  maxAggregatorQueries: z.number().int().min(0).max(200).optional(),
  dryRun: z.boolean().optional().default(false),
})

export type IngestRequestInput = z.infer<typeof ingestRequestSchema>

/* ============================================================
 * DTO — bentuk yang dikirim ke frontend
 * ============================================================ */

export type SearchProfileDto = {
  id: string
  cvId: string
  cvVersion: number
  roles: string[]
  skills: string[]
  locations: string[]
  industries: string[]
  seniority: SeniorityLevel | null
  remotePref: RemotePref
  yearsExp: number | null
  salaryMin: number | null
  salaryMax: number | null
  /** false = sudah dikoreksi user, jangan ditimpa hasil LLM. */
  isAutoGenerated: boolean
}

/**
 * Sumber lowongan — WAJIB tampil di kartu hasil.
 * Prinsip produk: Dilirik tidak pernah mengklaim "seluruh internet".
 */
export type JobSourceDto = {
  providerId: string
  displayName: string
  url: string
  applyUrl: string
  postedAt: string | null
}

export type JobMatchDto = {
  id: string
  rank: number
  isTopPick: boolean
  /** Label UI: "Perkiraan cocok" — BUKAN skor analisis (PRD §6.3). */
  estimatedScore: number

  title: string
  company: string
  location: string | null
  remoteType: RemoteType | null
  salaryMin: number | null
  salaryMax: number | null
  currency: string | null
  salaryPeriod: string | null

  reasonText: string | null
  cautionText: string | null
  matchedSkills: string[]
  missingSkills: string[]

  // Transparansi wajib (PRD §6.3 & keputusan produk)
  sources: JobSourceDto[]
  primarySource: string
  postedAt: string | null
  postedHoursAgo: number | null
  indexedAt: string
  indexedHoursAgo: number
  isLikelyStale: boolean

  status: JobMatchStatus
}

export type DiscoveryEmptyStateDto = {
  message: string
  detail: string
  canRequestAlert: boolean
  pendingQueryId: string | null
}

export type DiscoverySearchResponse = {
  runId: string
  status: DiscoveryRunStatus
  searchProfile: SearchProfileDto
  topPicks: JobMatchDto[]
  otherCandidates: JobMatchDto[]
  emptyState?: DiscoveryEmptyStateDto
  meta: {
    candidateCount: number
    indexAgeHours: number | null
    indexIsPartial: boolean
    unavailableSources: string[]
    relaxedFilters: string[]
    quotaRemaining: number | null
    curationNote: string | null
  }
}

export type DiscoveryStatusDto = {
  indexJobCount: number
  indexAgeHours: number | null
  lastIngestionStatus: string | null
  unavailableSources: string[]
  quota: {
    quota: number | null
    used: number
    remaining: number | null
    resetAt: string
  }
}

export type DiscoveryRunListItemDto = {
  id: string
  cvId: string
  status: DiscoveryRunStatus
  candidateCount: number
  curatedCount: number
  indexAgeHours: number | null
  createdAt: string
}
