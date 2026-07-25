import { prisma } from "@dilirik/db"
import { buildInterviewPersona, generateInterviewFeedback } from "@dilirik/ai"
import {
  INTERVIEW_CLOSING_PHRASES,
  INTERVIEW_MAX_DURATION_SEC,
  MAX_CV_CHARS,
  MAX_JOB_CHARS,
  type InterviewPersona,
} from "@dilirik/shared"
import { HttpError, notFound } from "../middleware/errorHandler"
import { consumeInterviewQuota } from "./interviewQuota"

export type TranscriptEntry = { role: "interviewer" | "candidate"; text: string; at: number }

/** Ringkasan lowongan untuk konteks pewawancara — defensif terhadap bentuk parsedJson. */
function jobSummaryFrom(job: { parsedJson: unknown; rawText: string }): string {
  const p = (job.parsedJson ?? {}) as Record<string, unknown>
  const title = typeof p.jobTitle === "string" ? p.jobTitle : ""
  const company = typeof p.company === "string" ? p.company : ""
  const header = [title && `Posisi: ${title}`, company && `Perusahaan: ${company}`]
    .filter(Boolean)
    .join("\n")
  return `${header}\n\nDeskripsi lowongan:\n${job.rawText.slice(0, MAX_JOB_CHARS)}`.trim()
}

/** Gap hasil analisis (engine v2) → daftar poin yang layak digali pewawancara. */
function gapsSummaryFrom(gapsJson: unknown): string | undefined {
  if (!Array.isArray(gapsJson) || gapsJson.length === 0) return undefined
  const lines = gapsJson.slice(0, 8).map((g) => {
    const gap = (g ?? {}) as Record<string, unknown>
    const skill = typeof gap.skill === "string" ? gap.skill : "(tanpa nama)"
    const type = gap.type === "real" ? "gap beneran" : "gap penyajian"
    const explanation = typeof gap.explanation === "string" ? ` — ${gap.explanation}` : ""
    return `- ${skill} (${type})${explanation}`
  })
  return lines.join("\n")
}

export async function createInterviewSession(args: {
  userId: string
  cvId?: string
  jobPostingId?: string
  analysisId?: string
  persona: InterviewPersona
  language?: string
}) {
  const { userId } = args

  // Analisis opsional — kalau ada, pewawancara ikut menggali gap hasil analisis.
  const analysis = args.analysisId
    ? await prisma.analysis.findFirst({ where: { id: args.analysisId, userId } })
    : null
  if (args.analysisId && !analysis) throw notFound("analysis")

  const cvId = args.cvId ?? analysis?.cvId ?? undefined
  const jobPostingId = args.jobPostingId ?? analysis?.jobPostingId ?? undefined

  if (!cvId) throw new HttpError(400, "VALIDATION_ERROR", "Pilih CV dulu untuk memulai latihan interview")
  const cv = await prisma.cv.findFirst({ where: { id: cvId, userId } })
  if (!cv) throw notFound("cv")

  const job = jobPostingId
    ? await prisma.jobPosting.findFirst({ where: { id: jobPostingId, userId } })
    : null
  if (jobPostingId && !job) throw notFound("jobPosting")

  const language = args.language ?? cv.language ?? "id"
  const parsed = (job?.parsedJson ?? {}) as Record<string, unknown>
  const jobTitle = typeof parsed.jobTitle === "string" && parsed.jobTitle ? parsed.jobTitle : null
  const title = jobTitle ? `Interview: ${jobTitle}` : `Latihan Umum: ${cv.title}`

  // Konteks dibekukan ke systemPrompt DI SERVER — browser tidak pernah merakit prompt.
  const systemPrompt = buildInterviewPersona({
    persona: args.persona,
    language,
    cvText: cv.rawText.slice(0, MAX_CV_CHARS),
    jobSummary: job ? jobSummaryFrom(job) : undefined,
    gapsSummary: analysis ? gapsSummaryFrom(analysis.gapsJson) : undefined,
    maxDurationMin: Math.round(INTERVIEW_MAX_DURATION_SEC / 60),
    closingPhrase: language === "id" ? INTERVIEW_CLOSING_PHRASES[0] : INTERVIEW_CLOSING_PHRASES[1],
  })

  // Kuota dipotong saat sesi DIBUAT — throw INTERVIEW_QUOTA_EXCEEDED bila habis.
  await consumeInterviewQuota(userId)

  return prisma.interviewSession.create({
    data: {
      userId,
      persona: args.persona,
      language,
      title,
      cvId: cv.id,
      jobPostingId: job?.id ?? null,
      analysisId: analysis?.id ?? null,
      systemPrompt,
      maxDurationSec: INTERVIEW_MAX_DURATION_SEC,
    },
  })
}

export async function listInterviewSessions(userId: string) {
  const sessions = await prisma.interviewSession.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, status: true, persona: true, language: true, title: true,
      durationSec: true, createdAt: true, analysisId: true, feedbackJson: true,
    },
  })
  // List ringan: feedbackJson diringkas jadi overallScore saja.
  return sessions.map(({ feedbackJson, ...s }) => {
    const fb = feedbackJson as { overallScore?: number } | null
    return { ...s, overallScore: typeof fb?.overallScore === "number" ? fb.overallScore : null }
  })
}

export async function getInterviewSession(userId: string, id: string) {
  const session = await prisma.interviewSession.findFirst({ where: { id, userId } })
  if (!session) throw notFound("interviewSession")
  return session
}

/** Dipanggil saat FE minta ephemeral token: CREATED/LIVE → LIVE (reconnect diperbolehkan). */
export async function startInterviewSession(userId: string, id: string) {
  const session = await getInterviewSession(userId, id)
  if (session.status === "ENDED" || session.status === "FEEDBACK_READY") {
    throw new HttpError(409, "INTERVIEW_ALREADY_ENDED", "Sesi interview ini sudah selesai")
  }
  return prisma.interviewSession.update({
    where: { id: session.id },
    data: { status: "LIVE", startedAt: session.startedAt ?? new Date() },
  })
}

/** Simpan transkrip TEPAT SEKALI — panggilan kedua idempoten (tidak menimpa). */
export async function endInterviewSession(
  userId: string,
  id: string,
  args: { transcriptJson: TranscriptEntry[]; durationSec: number },
) {
  const session = await getInterviewSession(userId, id)
  if (session.status === "ENDED" || session.status === "FEEDBACK_READY") return session
  const durationSec = Math.min(args.durationSec, session.maxDurationSec + 60)
  return prisma.interviewSession.update({
    where: { id: session.id },
    data: { status: "ENDED", endedAt: new Date(), transcriptJson: args.transcriptJson, durationSec },
  })
}

/** Feedback dibuat SEKALI per sesi (non-live, model murah) — tidak memotong kuota. */
export async function generateFeedback(userId: string, id: string) {
  const session = await getInterviewSession(userId, id)
  if (session.feedbackJson) return session // idempoten
  const transcript = session.transcriptJson as TranscriptEntry[] | null
  if (!Array.isArray(transcript) || !transcript.some((t) => t.role === "candidate" && t.text.trim())) {
    throw new HttpError(400, "INTERVIEW_NO_TRANSCRIPT", "Belum ada jawaban kandidat yang bisa dinilai di sesi ini")
  }
  const feedback = await generateInterviewFeedback({
    transcript: transcript.map(({ role, text }) => ({ role, text })),
    language: session.language,
    context: session.title,
  })
  return prisma.interviewSession.update({
    where: { id: session.id },
    data: { feedbackJson: feedback, status: "FEEDBACK_READY" },
  })
}

export async function deleteInterviewSession(userId: string, id: string): Promise<void> {
  const { count } = await prisma.interviewSession.deleteMany({ where: { id, userId } })
  if (count === 0) throw notFound("interviewSession")
}
