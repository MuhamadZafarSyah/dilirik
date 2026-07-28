import { z } from "zod"

/**
 * Kontrak Cover Letter Generator (AI).
 *
 * Catatan konvensi: konstanta modul ini sengaja hidup berdampingan dengan
 * schema-nya (bukan di `constants.ts`) supaya seluruh kontrak fitur cover
 * letter bisa dibaca dalam satu file. Semuanya tetap di-reexport lewat
 * `packages/shared/src/index.ts`, jadi pemakaian di app tidak berubah.
 */

/** Versi engine — naikkan saat prompt/guardrail berubah (ikut tersimpan untuk audit). */
export const COVER_LETTER_ENGINE_VERSION = "1.0.0"

/** Kuota cover letter default per bulan. null = unlimited (pola PRD §14). */
export const DEFAULT_COVER_LETTER_QUOTA = 10

// ===== Bahasa =====
export const COVER_LETTER_LANGUAGES = ["id", "en"] as const
export type CoverLetterLanguage = (typeof COVER_LETTER_LANGUAGES)[number]

export const COVER_LETTER_LANGUAGE_LABELS: Record<CoverLetterLanguage, { id: string; en: string }> = {
  id: { id: "Bahasa Indonesia", en: "Indonesian" },
  en: { id: "Bahasa Inggris", en: "English" },
}

// ===== Tone =====
export const COVER_LETTER_TONES = ["SANTAI", "PROFESIONAL", "ANTUSIAS", "FORMAL"] as const
export type CoverLetterTone = (typeof COVER_LETTER_TONES)[number]

export const COVER_LETTER_TONE_LABELS: Record<
  CoverLetterTone,
  { id: string; en: string; emoji: string; hint: { id: string; en: string } }
> = {
  SANTAI: {
    id: "Santai",
    en: "Casual",
    emoji: "🙂",
    hint: {
      id: "Hangat dan membumi — cocok untuk startup & tim produk",
      en: "Warm and down-to-earth — fits startups & product teams",
    },
  },
  PROFESIONAL: {
    id: "Profesional",
    en: "Professional",
    emoji: "💼",
    hint: {
      id: "Netral, rapi, aman untuk hampir semua lowongan",
      en: "Neutral and polished — safe for almost any role",
    },
  },
  ANTUSIAS: {
    id: "Antusias",
    en: "Enthusiastic",
    emoji: "🔥",
    hint: {
      id: "Energik dan menunjukkan motivasi kuat, tetap tanpa lebay",
      en: "Energetic and motivated, without overselling",
    },
  },
  FORMAL: {
    id: "Formal",
    en: "Formal",
    emoji: "🏛️",
    hint: {
      id: "Baku dan konservatif — cocok untuk BUMN, bank, instansi",
      en: "Conservative and by-the-book — fits banks & institutions",
    },
  },
}

// ===== Panjang =====
export const COVER_LETTER_LENGTHS = ["SINGKAT", "SEDANG", "PANJANG"] as const
export type CoverLetterLength = (typeof COVER_LETTER_LENGTHS)[number]

export const COVER_LETTER_LENGTH_LABELS: Record<CoverLetterLength, { id: string; en: string }> = {
  SINGKAT: { id: "Singkat (~150 kata)", en: "Short (~150 words)" },
  SEDANG: { id: "Sedang (~250 kata)", en: "Medium (~250 words)" },
  PANJANG: { id: "Panjang (~350 kata)", en: "Long (~350 words)" },
}

/** Panduan jumlah kata + jumlah paragraf badan surat per pilihan panjang. */
export const COVER_LETTER_LENGTH_SPECS: Record<
  CoverLetterLength,
  { minWords: number; maxWords: number; bodyParagraphs: number }
> = {
  SINGKAT: { minWords: 110, maxWords: 180, bodyParagraphs: 1 },
  SEDANG: { minWords: 200, maxWords: 300, bodyParagraphs: 2 },
  PANJANG: { minWords: 300, maxWords: 420, bodyParagraphs: 3 },
}

// ===== Format ekspor =====
export const COVER_LETTER_EXPORT_FORMATS = ["txt", "docx", "pdf"] as const
export type CoverLetterExportFormat = (typeof COVER_LETTER_EXPORT_FORMATS)[number]

// ===== Struktur surat =====

/**
 * Satu paragraf badan surat. WAJIB membawa `evidenceFromCv` — kutipan fakta
 * yang benar-benar ada di CV. Paragraf tanpa bukti yang bisa diverifikasi
 * akan DITOLAK guardrail, bukan diperbaiki diam-diam.
 */
export const coverLetterParagraphSchema = z.object({
  text: z.string().min(1),
  evidenceFromCv: z.array(z.string()).min(1),
  targetRequirement: z.string().default(""),
})

export const coverLetterDraftSchema = z.object({
  /** Sapaan, mis. "Yth. Tim Rekrutmen Acme". */
  greeting: z.string().default(""),
  /** Paragraf pembuka: posisi yang dilamar + kail singkat. */
  opening: z.string().min(1),
  bodyParagraphs: z.array(coverLetterParagraphSchema).min(1).max(4),
  /** Paragraf penutup: ajakan lanjut ke tahap berikutnya. */
  closing: z.string().min(1),
  /** Salam penutup, mis. "Hormat saya,". */
  signOff: z.string().default(""),
})

export const generateCoverLetterSchema = z.object({
  cvId: z.string().min(1),
  jobPostingId: z.string().min(1),
  /** Opsional — bila diisi, surat memakai konteks skor/gap/careerNote analisis. */
  analysisId: z.string().min(1).optional(),
  language: z.enum(COVER_LETTER_LANGUAGES).default("id"),
  tone: z.enum(COVER_LETTER_TONES).default("PROFESIONAL"),
  length: z.enum(COVER_LETTER_LENGTHS).default("SEDANG"),
})

export type CoverLetterParagraph = z.infer<typeof coverLetterParagraphSchema>
export type CoverLetterDraft = z.infer<typeof coverLetterDraftSchema>
export type GenerateCoverLetterInput = z.infer<typeof generateCoverLetterSchema>

export type RejectedCoverLetterParagraph = {
  paragraph: CoverLetterParagraph
  reason: string
}

export type CoverLetterResult = {
  draft: CoverLetterDraft
  /** Teks final siap salin — sumber kebenaran untuk TXT/DOCX/PDF. */
  text: string
  rejectedParagraphs: RejectedCoverLetterParagraph[]
  language: CoverLetterLanguage
  tone: CoverLetterTone
  length: CoverLetterLength
  engineVersion: string
}
