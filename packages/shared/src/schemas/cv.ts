import { z } from "zod"
import { MAX_CV_CHARS } from "../constants"

/** Section dinamis di luar field standar (mis. Bahasa, Sertifikasi, Proyek, Organisasi). */
export const cvSectionSchema = z.object({
  label: z.string().min(1),
  items: z.array(z.string()).default([]),
})

export type CvSection = z.infer<typeof cvSectionSchema>

/** Struktur CV hasil parsing AI — target Zod untuk structured output. */
export const cvStructuredSchema = z.object({
  fullName: z.string().nullable().default(null),
  headline: z.string().nullable().default(null),
  // Ringkasan / tentang saya / profil singkat — APA ADANYA dari CV (null bila tidak ada)
  about: z.string().nullable().default(null),
  skills: z.array(z.string().min(1)).default([]),
  experiences: z
    .array(
      z.object({
        title: z.string(),
        company: z.string().nullable().default(null),
        period: z.string().nullable().default(null),
        highlights: z.array(z.string()).default([]),
      }),
    )
    .default([]),
  achievements: z.array(z.string()).default([]),
  education: z
    .array(
      z.object({
        institution: z.string(),
        degree: z.string().nullable().default(null),
        period: z.string().nullable().default(null),
      }),
    )
    .default([]),
  // Section lain APA ADANYA dari CV — dinamis, label mengikuti CV user
  sections: z.array(cvSectionSchema).default([]),
})

export type CvStructured = z.infer<typeof cvStructuredSchema>

export const createCvSchema = z.object({
  title: z.string().min(1).max(150),
  rawText: z.string().min(50, "Teks CV terlalu pendek").max(MAX_CV_CHARS),
})

export const updateCvTitleSchema = z.object({ title: z.string().min(1).max(150) })

export type CreateCvInput = z.infer<typeof createCvSchema>

export type CvDto = {
  id: string
  title: string
  language: string
  version: number
  parentCvId: string | null
  structured: CvStructured
  createdAt: string
  updatedAt: string
}
