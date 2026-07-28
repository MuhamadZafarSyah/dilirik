import { z } from "zod"
import { COVER_LETTER_TEMPLATES } from "../constants.js"

export const generateCoverLetterSchema = z.object({
  cvId: z.string().min(1, "cvId wajib diisi"),
  jobPostingId: z.string().min(1, "jobPostingId wajib diisi"),
  analysisId: z.string().optional(),
  language: z.enum(["id", "en"]).optional(),
  template: z.enum(COVER_LETTER_TEMPLATES).optional().default("professional"),
  customInstructions: z.string().max(1000, "Instruksi tambahan maksimal 1000 karakter").optional(),
})

export type GenerateCoverLetterInput = z.infer<typeof generateCoverLetterSchema>

export const updateCoverLetterSchema = z.object({
  text: z.string().min(10, "Isi surat lamaran minimal 10 karakter").optional(),
  template: z.enum(COVER_LETTER_TEMPLATES).optional(),
  customInstructions: z.string().max(1000).optional(),
})

export type UpdateCoverLetterInput = z.infer<typeof updateCoverLetterSchema>

export type CoverLetterDto = {
  id: string
  userId: string
  cvId: string
  jobPostingId: string
  analysisId: string | null
  text: string
  language: "id" | "en"
  template: string
  customInstructions: string | null
  relevanceScore: number | null
  wordCount: number
  docxKey: string | null
  pdfKey: string | null
  createdAt: string
  updatedAt: string
  cv?: {
    id: string
    title: string
  }
  jobPosting?: {
    id: string
    title?: string
    company?: string
  }
  analysis?: {
    id: string
    matchScore: number
  }
}
