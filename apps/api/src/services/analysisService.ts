import { prisma } from "@dilirik/db"
import { analyze } from "@dilirik/ai"
import {
  DEFAULT_REPORT_LANGUAGE,
  ENGINE_VERSION,
  PROMPT_VERSION,
  cvStructuredSchema,
  jobParsedSchema,
  type AnalysisResult,
  type ReportLanguage,
} from "@dilirik/shared"
import { notFound } from "../middleware/errorHandler"
import { analysisCacheKey, getCachedAnalysis, setCachedAnalysis } from "./analysisCache"
import { consumeQuota } from "./quota"
import { getCv } from "./cvService"
import { getJob } from "./jobService"

/**
 * Kembalikan kuota yang sudah terlanjur dipotong ketika pipeline AI gagal.
 * Tanpa ini, satu StructuredOutputError = satu jatah analisis user hangus
 * padahal dia tidak menerima hasil apa pun.
 */
async function refundQuota(userId: string) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { analysisUsedThisPeriod: { decrement: 1 } },
    })
  } catch {
    // Refund bersifat best-effort: kegagalan di sini tidak boleh menutupi
    // error asli yang sedang dilempar ke user.
  }
}

/**
 * Jalankan analisis (PRD §7.4 & §8):
 * 1. Ownership check CV + lowongan.
 * 2. Cek cache (Redis + DB) — hit = GRATIS (tidak konsumsi kuota, tidak panggil AI).
 * 3. Miss → cek & konsumsi kuota → pipeline AI → simpan Analysis + cache.
 * Engine v2: careerNote & mode ikut disimpan DI DALAM suggestionsJson
 * (kolom JSON yang sama — tidak butuh migrasi Prisma).
 * Engine v3: cacheKey ikut memperhitungkan PROMPT_VERSION, supaya eksperimen
 * prompt tidak diam-diam menyajikan hasil dari prompt lama.
 * Engine v3.3.0: cacheKey ikut memperhitungkan bahasa laporan. Tanpa ini, orang
 * pertama yang menganalisis sebuah pasangan CV+lowongan akan mengunci bahasa
 * laporannya untuk semua orang berikutnya — termasuk dirinya sendiri setelah
 * mengganti bahasa di antarmuka. `reportLanguage` disimpan di dalam
 * suggestionsJson, pola yang sama dengan promptVersion, jadi tetap tanpa
 * migrasi Prisma.
 */
export async function runAnalysis(args: {
  userId: string
  cvId: string
  jobPostingId: string
  reportLanguage?: ReportLanguage
}) {
  const reportLanguage = args.reportLanguage ?? DEFAULT_REPORT_LANGUAGE

  const [cv, job] = await Promise.all([
    getCv(args.userId, args.cvId),
    getJob(args.userId, args.jobPostingId),
  ])

  const cacheKey = analysisCacheKey(
    cv.rawText,
    job.rawText,
    `${ENGINE_VERSION}+${PROMPT_VERSION}+${reportLanguage}`,
  )

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
    try {
      result = await analyze({
        cv: cvStructuredSchema.parse(cv.structuredJson),
        job: jobParsedSchema.parse(job.parsedJson),
        rawText: cv.rawText,
        language: cv.language,
        reportLanguage,
      })
    } catch (error) {
      await refundQuota(args.userId)
      throw error
    }
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
        careerNote: result.careerNote,
        mode: result.mode,
        promptVersion: result.promptVersion ?? PROMPT_VERSION,
        reportLanguage: result.reportLanguage ?? reportLanguage,
      },
      // Kolom `language` tetap merekam bahasa DOKUMEN, bukan bahasa laporan —
      // dua hal berbeda yang sengaja tidak digabung.
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
