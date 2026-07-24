import { z } from "zod"

/**
 * Sesi analisis 1-alur (wizard): CV → lowongan → hasil → revisi → selesai.
 * Sesi yang ditinggalkan berstatus DRAFT dan bisa dilanjutkan kapan saja.
 */
export const SESSION_STEPS = ["CV", "JOB", "REVIEW", "REVISE", "FINISH"] as const
export type SessionStep = (typeof SESSION_STEPS)[number]

export const SESSION_STATUSES = ["DRAFT", "COMPLETED"] as const
export type SessionStatus = (typeof SESSION_STATUSES)[number]

export const updateSessionSchema = z.object({
  step: z.enum(SESSION_STEPS).optional(),
  status: z.enum(SESSION_STATUSES).optional(),
  cvId: z.string().min(1).nullable().optional(),
  jobPostingId: z.string().min(1).nullable().optional(),
  analysisId: z.string().min(1).nullable().optional(),
  revisedCvId: z.string().min(1).nullable().optional(),
  applicationId: z.string().min(1).nullable().optional(),
})

export type UpdateSessionInput = z.infer<typeof updateSessionSchema>
