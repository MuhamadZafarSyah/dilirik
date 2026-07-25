/** Status pipeline lamaran — urutan sesuai PRD §7.5. */
export const APPLICATION_STATUSES = [
  "DISIMPAN",
  "DILAMAR",
  "SCREENING",
  "INTERVIEW",
  "OFFER",
  "DITOLAK",
] as const

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, { id: string; en: string }> = {
  DISIMPAN: { id: "Disimpan", en: "Saved" },
  DILAMAR: { id: "Dilamar", en: "Applied" },
  SCREENING: { id: "Screening", en: "Screening" },
  INTERVIEW: { id: "Interview", en: "Interview" },
  OFFER: { id: "Offer", en: "Offer" },
  DITOLAK: { id: "Ditolak", en: "Rejected" },
}

/**
 * Versi mesin analisis — naikkan saat prompt/pipeline berubah agar cache invalid.
 * v2.0.0: gaps+suggestions+careerNote digabung jadi SATU panggilan LLM (satu
 * rantai pemikiran), mode adaptif (optimize/reframe/honest_pivot) dari coverage
 * must-have, taksonomi gap, dan guardrail relevansi/anti-kosmetik.
 */
export const ENGINE_VERSION = "2.0.0"

/** Kuota analisis default per bulan (null = unlimited). PRD §14. */
export const DEFAULT_ANALYSIS_QUOTA = 10

/** Semantik warna skor — Design System §Score. */
export function scoreTone(score: number): "red" | "yellow" | "green" {
  if (score < 50) return "red"
  if (score < 75) return "yellow"
  return "green"
}

/** Batas panjang input untuk kontrol biaya AI (karakter). */
export const MAX_CV_CHARS = 20_000
export const MAX_JOB_CHARS = 12_000
