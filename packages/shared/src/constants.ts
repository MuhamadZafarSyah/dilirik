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
 * v3.0.0: pencocokan skill berbasis token + peta alias (bukan substring dua
 * arah), schema saran v3 (addressesGap/whatChanged/rationale/impact), guardrail
 * 5 titik (anchor verbatim, kejujuran, frasa terlarang, kebergunaan, dedup),
 * repair loop pada output terstruktur, dan refund kuota saat pipeline gagal.
 */
export const ENGINE_VERSION = "3.0.0"

/**
 * Versi PROMPT — dipisah dari ENGINE_VERSION supaya eksperimen kalimat prompt
 * bisa menginvalidasi cache TANPA mengklaim perubahan arsitektur mesin.
 * WAJIB dinaikkan setiap kali isi prompt analisis diubah, sekecil apa pun.
 */
export const PROMPT_VERSION = "p3.0.0-2026-08-03"

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

// ===== Live Mock Interview (PRD §7.7, M5) =====

/** Kuota sesi latihan interview default per bulan (null = unlimited). */
export const DEFAULT_INTERVIEW_QUOTA = 5

/** Model Gemini Live untuk percakapan suara realtime (referensi: Career-Vibe). */
export const INTERVIEW_LIVE_MODEL = "gemini-3.1-flash-live-preview"

/** Durasi maksimum satu sesi interview — hard cap biaya (detik). */
export const INTERVIEW_MAX_DURATION_SEC = 600

/**
 * Frasa penutup baku — persona diinstruksikan menutup sesi dengan kalimat yang
 * MENGANDUNG salah satu frasa ini, dan FE memakai frasa yang sama untuk auto-end.
 */
export const INTERVIEW_CLOSING_PHRASES = [
  "sesi interview kita selesai",
  "our interview session is complete",
] as const

export const INTERVIEW_PERSONAS = ["SANTAI", "NETRAL", "TEGAS", "MENEKAN"] as const
export type InterviewPersona = (typeof INTERVIEW_PERSONAS)[number]

export const INTERVIEW_PERSONA_LABELS: Record<
  InterviewPersona,
  { id: string; en: string; hint: { id: string; en: string }; emoji: string }
> = {
  SANTAI: {
    id: "Santai", en: "Casual", emoji: "😄",
    hint: { id: "Ngobrol hangat — cocok buat pemanasan", en: "Warm chat — good for warming up" },
  },
  NETRAL: {
    id: "Netral", en: "Neutral", emoji: "🙂",
    hint: { id: "HR profesional pada umumnya", en: "Typical professional HR" },
  },
  TEGAS: {
    id: "Tegas", en: "Strict", emoji: "🧐",
    hint: { id: "To the point, menggali detail jawaban", en: "To the point, digs into details" },
  },
  MENEKAN: {
    id: "Menekan", en: "Pressure", emoji: "🔥",
    hint: { id: "Menantang & menguji ketahanan argumen", en: "Challenging & stress-tests your answers" },
  },
}

export const INTERVIEW_STATUSES = ["CREATED", "LIVE", "ENDED", "FEEDBACK_READY"] as const
export type InterviewStatus = (typeof INTERVIEW_STATUSES)[number]

// ===== Cover Letter Generator (PRD Cover Letter §9.2) =====

/** Kuota gratis pembuatan surat lamaran default per bulan (null = unlimited). */
export const DEFAULT_COVER_LETTER_QUOTA = 3

export const COVER_LETTER_TEMPLATES = ["professional", "modern", "creative"] as const
export type CoverLetterTemplate = (typeof COVER_LETTER_TEMPLATES)[number]

export const COVER_LETTER_TEMPLATE_LABELS: Record<
  CoverLetterTemplate,
  { id: string; en: string; description: { id: string; en: string } }
> = {
  professional: {
    id: "Profesional",
    en: "Professional",
    description: {
      id: "Format bisnis klasik dengan nada formal, cocok untuk perusahaan korporasi",
      en: "Classic business layout with formal tone, suitable for corporate roles",
    },
  },
  modern: {
    id: "Modern",
    en: "Modern",
    description: {
      id: "Tampilan bersih & kontemporer dengan penekanan pada pencapaian utama",
      en: "Clean contemporary layout with emphasis on key achievements",
    },
  },
  creative: {
    id: "Kreatif",
    en: "Creative",
    description: {
      id: "Pendekatan bercerita (storytelling) dengan sentuhan estetika scrapbook",
      en: "Storytelling approach with scrapbook aesthetic touch",
    },
  },
}
