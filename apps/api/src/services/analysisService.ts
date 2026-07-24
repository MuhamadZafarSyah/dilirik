import { prisma } from "@dilirik/db"
import { analyze } from "@dilirik/ai"
import {
  ENGINE_VERSION,
  cvStructuredSchema,
  jobParsedSchema,
  type AnalysisResult,
} from "@dilirik/shared"
import { notFound } from "../middleware/errorHandler"
import { analysisCacheKey, getCachedAnalysis, setCachedAnalysis } from "./analysisCache"
import { consumeQuota } from "./quota"
import { getCv } from "./cvService"
import { getJob } from "./jobService"

/**
 * Jalankan analisis (PRD §7.4 & §8):
 * 1. Ownership check CV + lowongan.
 * 2. Cek cache (Redis + DB) — hit = GRATIS (tidak konsumsi kuota, tidak panggil AI).
 * 3. Miss → cek & konsumsi kuota → pipeline AI → simpan Analysis + cache.
 */
export async function runAnalysis(args: { userId: string; cvId: string; jobPostingId: string }) {
  const [cv, job] = await Promise.all([
    getCv(args.userId, args.cvId),
    getJob(args.userId, args.jobPostingId),
  ])

  const cacheKey = analysisCacheKey(cv.rawText, job.rawText, ENGINE_VERSION)

  // Cache DB (hasil identik sudah pernah dianalisis user ini)
  const existing = await prisma.analysis.findFirst({
    where: { cacheKey, userId: args.userId },
    orderBy: { createdAt: "desc" },
  })
  if (existing) return { analysis: existing, cached: true as const }

  // Cache Redis (lintas entitas, hemat token)
  const cachedResult = await getCachedAnalysis(cacheKey)
  let result: AnalysisResult
  if (cachedResult) {
    result = cachedResult
  } else {
    await consumeQuota(args.userId) // 429 QUOTA_EXCEEDED bila habis
    result = await analyze({
      cv: cvStructuredSchema.parse(cv.structuredJson),
      job: jobParsedSchema.parse(job.parsedJson),
      language: cv.language,
    })
    await setCachedAnalysis(cacheKey, result)
  }

  const analysis = await prisma.analysis.create({
    data: {
      userId: args.userId,
      cvId: cv.id,
      jobPostingId: job.id,
      cacheKey,
      matchScore: result.matchScore,
      gapsJson: result.gaps,
      suggestionsJson: {
        suggestions: result.suggestions,
        rejected: result.rejectedSuggestions,
        ruleScore: result.ruleScore,
        semanticScore: result.semanticScore,
      },
      language: result.language,
      engineVersion: result.engineVersion,
    },
  })
  return { analysis, cached: Boolean(cachedResult) }
}

export async function getAnalysis(userId: string, id: string) {
  const analysis = await prisma.analysis.findFirst({
    where: { id, userId },
    include: { cv: { select: { id: true, title: true, version: true, language: true } } },
  })
  if (!analysis) throw notFound("Analisis")
  return analysis
}
