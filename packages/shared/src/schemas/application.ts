import { z } from "zod"
import { APPLICATION_STATUSES } from "../constants"

export const createApplicationSchema = z.object({
  cvId: z.string().min(1),
  jobPostingId: z.string().min(1),
  analysisId: z.string().optional(),
})

export const updateApplicationSchema = z.object({
  status: z.enum(APPLICATION_STATUSES).optional(),
  notes: z.string().max(5000).nullable().optional(),
  appliedAt: z.string().datetime().nullable().optional(),
})

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>
export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>
