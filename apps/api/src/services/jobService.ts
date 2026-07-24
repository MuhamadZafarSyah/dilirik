import { prisma } from "@dilirik/db"
import { parseJob } from "@dilirik/ai"
import { notFound } from "../middleware/errorHandler"

export async function createJob(args: { userId: string; rawText: string; sourceUrl?: string }) {
  const parsed = await parseJob(args.rawText)
  return prisma.jobPosting.create({
    data: {
      userId: args.userId,
      rawText: args.rawText,
      sourceUrl: args.sourceUrl ?? null,
      parsedJson: parsed,
    },
  })
}

export async function listJobs(userId: string) {
  return prisma.jobPosting.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, parsedJson: true, sourceUrl: true, createdAt: true },
  })
}

export async function getJob(userId: string, jobId: string) {
  const job = await prisma.jobPosting.findFirst({ where: { id: jobId, userId } })
  if (!job) throw notFound("Lowongan")
  return job
}

export async function deleteJob(userId: string, jobId: string) {
  await getJob(userId, jobId)
  await prisma.jobPosting.delete({ where: { id: jobId } })
}
