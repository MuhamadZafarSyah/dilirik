import { prisma, type AnalysisSession } from "@dilirik/db"
import type { UpdateSessionInput } from "@dilirik/shared"
import { notFound } from "../middleware/errorHandler"

/**
 * Sesi analisis 1-alur (wizard): pilih/upload CV → lowongan → hasil → revisi → selesai.
 * Sesi yang ditinggalkan tetap DRAFT dan bisa dilanjutkan kapan saja.
 * Referensi entitas disimpan sebagai id longgar (tanpa FK) supaya draft tetap
 * hidup meskipun CV/lowongan-nya dihapus — hydrate mengembalikan null bila hilang.
 */

async function hydrate(userId: string, session: AnalysisSession) {
  const [cv, job, revisedCv] = await Promise.all([
    session.cvId
      ? prisma.cv.findFirst({
          where: { id: session.cvId, userId },
          select: { id: true, title: true, version: true, language: true },
        })
      : null,
    session.jobPostingId
      ? prisma.jobPosting.findFirst({
          where: { id: session.jobPostingId, userId },
          select: { id: true, parsedJson: true },
        })
      : null,
    session.revisedCvId
      ? prisma.cv.findFirst({
          where: { id: session.revisedCvId, userId },
          select: { id: true, title: true, version: true, language: true },
        })
      : null,
  ])
  return { ...session, cv, job, revisedCv }
}

export async function createSession(userId: string) {
  const session = await prisma.analysisSession.create({ data: { userId } })
  return hydrate(userId, session)
}

export async function listSessions(userId: string) {
  const sessions = await prisma.analysisSession.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 30,
  })
  return Promise.all(sessions.map((s) => hydrate(userId, s)))
}

export async function getSession(userId: string, id: string) {
  const session = await prisma.analysisSession.findFirst({ where: { id, userId } })
  if (!session) throw notFound("Sesi")
  return hydrate(userId, session)
}

async function assertOwnedCv(userId: string, id: string) {
  const found = await prisma.cv.findFirst({ where: { id, userId }, select: { id: true } })
  if (!found) throw notFound("CV")
}

async function assertOwnedJob(userId: string, id: string) {
  const found = await prisma.jobPosting.findFirst({ where: { id, userId }, select: { id: true } })
  if (!found) throw notFound("Lowongan")
}

async function assertOwnedAnalysis(userId: string, id: string) {
  const found = await prisma.analysis.findFirst({ where: { id, userId }, select: { id: true } })
  if (!found) throw notFound("Analisis")
}

async function assertOwnedApplication(userId: string, id: string) {
  const found = await prisma.application.findFirst({ where: { id, userId }, select: { id: true } })
  if (!found) throw notFound("Lamaran")
}

export async function updateSession(userId: string, id: string, input: UpdateSessionInput) {
  const existing = await prisma.analysisSession.findFirst({ where: { id, userId } })
  if (!existing) throw notFound("Sesi")

  // Ownership check semua referensi yang dikirim (anti-IDOR)
  await Promise.all([
    input.cvId ? assertOwnedCv(userId, input.cvId) : null,
    input.revisedCvId ? assertOwnedCv(userId, input.revisedCvId) : null,
    input.jobPostingId ? assertOwnedJob(userId, input.jobPostingId) : null,
    input.analysisId ? assertOwnedAnalysis(userId, input.analysisId) : null,
    input.applicationId ? assertOwnedApplication(userId, input.applicationId) : null,
  ])

  const session = await prisma.analysisSession.update({
    where: { id },
    data: {
      ...(input.step !== undefined ? { step: input.step } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.cvId !== undefined ? { cvId: input.cvId } : {}),
      ...(input.jobPostingId !== undefined ? { jobPostingId: input.jobPostingId } : {}),
      ...(input.analysisId !== undefined ? { analysisId: input.analysisId } : {}),
      ...(input.revisedCvId !== undefined ? { revisedCvId: input.revisedCvId } : {}),
      ...(input.applicationId !== undefined ? { applicationId: input.applicationId } : {}),
    },
  })
  return hydrate(userId, session)
}

export async function deleteSession(userId: string, id: string) {
  const existing = await prisma.analysisSession.findFirst({ where: { id, userId } })
  if (!existing) throw notFound("Sesi")
  await prisma.analysisSession.delete({ where: { id } })
}
