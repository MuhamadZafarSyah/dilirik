import { prisma, type Application } from "@dilirik/db"
import type { ApplicationStatus, UpdateApplicationInput } from "@dilirik/shared"
import { notFound } from "../middleware/errorHandler"
import { getCv } from "./cvService"
import { getJob } from "./jobService"

/** Buat lamaran (Flow D) — otomatis membawa matchScore dari analisis bila ada. */
export async function createApplication(args: {
  userId: string
  cvId: string
  jobPostingId: string
  analysisId?: string
}): Promise<Application> {
  await Promise.all([getCv(args.userId, args.cvId), getJob(args.userId, args.jobPostingId)])

  let matchScore: number | null = null
  if (args.analysisId) {
    const analysis = await prisma.analysis.findFirst({
      where: { id: args.analysisId, userId: args.userId },
    })
    matchScore = analysis?.matchScore ?? null
  }

  const application = await prisma.application.create({
    data: {
      userId: args.userId,
      cvId: args.cvId,
      jobPostingId: args.jobPostingId,
      matchScore,
      status: "DISIMPAN",
    },
  })

  if (args.analysisId) {
    await prisma.analysis.updateMany({
      where: { id: args.analysisId, userId: args.userId },
      data: { applicationId: application.id },
    })
  }
  return application
}

export async function listApplications(userId: string, status?: ApplicationStatus) {
  return prisma.application.findMany({
    where: { userId, ...(status ? { status } : {}) },
    orderBy: { updatedAt: "desc" },
    include: {
      cv: { select: { id: true, title: true, version: true } },
      jobPosting: { select: { id: true, parsedJson: true } },
    },
  })
}

export async function getApplication(userId: string, id: string) {
  const application = await prisma.application.findFirst({
    where: { id, userId },
    include: {
      cv: { select: { id: true, title: true, version: true } },
      jobPosting: { select: { id: true, parsedJson: true, rawText: true } },
      analyses: { orderBy: { createdAt: "desc" } },
    },
  })
  if (!application) throw notFound("Lamaran")
  return application
}

export async function updateApplication(
  userId: string,
  id: string,
  input: UpdateApplicationInput,
) {
  await getApplication(userId, id)
  return prisma.application.update({
    where: { id },
    data: {
      ...(input.status ? { status: input.status } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.appliedAt !== undefined
        ? { appliedAt: input.appliedAt ? new Date(input.appliedAt) : null }
        : {}),
    },
  })
}

export async function deleteApplication(userId: string, id: string) {
  await getApplication(userId, id)
  await prisma.application.delete({ where: { id } })
}
