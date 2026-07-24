import { z } from "zod"
import { MAX_JOB_CHARS } from "../constants"

/** Hasil parsing lowongan oleh AI — skill wajib vs opsional dipisah (PRD §8.1). */
export const jobParsedSchema = z.object({
  jobTitle: z.string().nullable().default(null),
  company: z.string().nullable().default(null),
  level: z.string().nullable().default(null),
  mustHaveSkills: z.array(z.string().min(1)).default([]),
  niceToHaveSkills: z.array(z.string().min(1)).default([]),
  requirements: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
})

export type JobParsed = z.infer<typeof jobParsedSchema>

export const createJobSchema = z.object({
  rawText: z.string().min(30, "Teks lowongan terlalu pendek").max(MAX_JOB_CHARS),
  sourceUrl: z.string().url().optional(),
})

export type CreateJobInput = z.infer<typeof createJobSchema>

export type JobDto = {
  id: string
  parsed: JobParsed
  createdAt: string
}
