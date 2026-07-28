import { Router } from "express"
import { z } from "zod"
import { INTERVIEW_CLOSING_PHRASES, INTERVIEW_LIVE_MODEL, INTERVIEW_PERSONAS } from "@dilirik/shared"
import { requireAuth } from "../middleware/requireAuth"
import { rateLimit } from "../middleware/rateLimit"
import { createEphemeralToken } from "../lib/gemini"
import { checkInterviewEntitlement } from "../services/interviewQuota"
import * as interviewService from "../services/interviewService"

export const interviewRouter = Router()
interviewRouter.use(requireAuth)

/** systemPrompt hanya dikirim lewat endpoint token — respons lain di-strip. */
function toPublic<T extends { systemPrompt?: string }>(session: T) {
  const { systemPrompt: _omit, ...rest } = session
  return rest
}

// Sisa kuota latihan interview (pola sama dengan /api/analyze/quota)
interviewRouter.get("/quota", async (req, res, next) => {
  try {
    const e = await checkInterviewEntitlement(req.userId!)
    res.json({ quota: e.quota, used: e.used, remaining: e.remaining, resetAt: e.resetAt.toISOString() })
  } catch (e) { next(e) }
})

interviewRouter.get("/sessions", async (req, res, next) => {
  try {
    res.json({ sessions: await interviewService.listInterviewSessions(req.userId!) })
  } catch (e) { next(e) }
})

const createSchema = z.object({
  cvId: z.string().optional(),
  jobPostingId: z.string().optional(),
  analysisId: z.string().optional(),
  persona: z.enum(INTERVIEW_PERSONAS).default("NETRAL"),
  language: z.string().max(8).optional(),
})

// Buat sesi — kuota dipotong DI SINI (bukan saat feedback)
interviewRouter.post("/sessions", rateLimit("interview-create", 5, 60), async (req, res, next) => {
  try {
    const input = createSchema.parse(req.body)
    const session = await interviewService.createInterviewSession({ userId: req.userId!, ...input })
    res.status(201).json({ session: toPublic(session) })
  } catch (e) { next(e) }
})

interviewRouter.get("/sessions/:id", async (req, res, next) => {
  try {
    const session = await interviewService.getInterviewSession(req.userId!, req.params.id!)
    res.json({ session: toPublic(session) })
  } catch (e) { next(e) }
})

// Ephemeral token: browser connect langsung ke Gemini Live TANPA GEMINI_API_KEY (T-M5-03)
interviewRouter.post("/sessions/:id/token", rateLimit("interview-token", 10, 60), async (req, res, next) => {
  try {
    const session = await interviewService.startInterviewSession(req.userId!, req.params.id as string)
    const { token, expireAt } = await createEphemeralToken()
    res.json({
      token,
      expireAt,
      model: INTERVIEW_LIVE_MODEL,
      systemPrompt: session.systemPrompt,
      language: session.language,
      maxDurationSec: session.maxDurationSec,
      closingPhrases: INTERVIEW_CLOSING_PHRASES,
    })
  } catch (e) { next(e) }
})

const transcriptEntrySchema = z.object({
  role: z.enum(["interviewer", "candidate"]),
  text: z.string().max(8_000),
  at: z.number(),
})
const endSchema = z.object({
  transcriptJson: z.array(transcriptEntrySchema).max(500),
  durationSec: z.number().int().min(0).max(7_200),
})

// Akhiri sesi + simpan transkrip (idempoten — transkrip tersimpan tepat sekali)
interviewRouter.patch("/sessions/:id", async (req, res, next) => {
  try {
    const input = endSchema.parse(req.body)
    const session = await interviewService.endInterviewSession(req.userId!, req.params.id!, input)
    res.json({ session: toPublic(session) })
  } catch (e) { next(e) }
})

// Feedback pasca-sesi — 1 panggilan LLM non-live, idempoten
interviewRouter.post("/sessions/:id/feedback", rateLimit("interview-feedback", 4, 60), async (req, res, next) => {
  try {
    const session = await interviewService.generateFeedback(req.userId!, req.params.id as string)
    res.json({ session: toPublic(session) })
  } catch (e) { next(e) }
})

interviewRouter.delete("/sessions/:id", async (req, res, next) => {
  try {
    await interviewService.deleteInterviewSession(req.userId!, req.params.id!)
    res.status(204).end()
  } catch (e) { next(e) }
})
