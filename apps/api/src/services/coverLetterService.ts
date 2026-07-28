import { prisma } from "@dilirik/db"
import { EmptyCoverLetterError, generateCoverLetter } from "@dilirik/ai"
import {
  COVER_LETTER_ENGINE_VERSION,
  cvStructuredSchema,
  jobParsedSchema,
  type CoverLetterExportFormat,
  type GenerateCoverLetterInput,
} from "@dilirik/shared"
import { HttpError, notFound } from "../middleware/errorHandler"
import { convertDocxToPdf, gotenbergEnabled } from "../lib/gotenberg"
import { logger } from "../lib/logger"
import { getCv } from "./cvService"
import { getJob } from "./jobService"
import { consumeCoverLetterQuota, refundCoverLetterQuota } from "./coverLetterQuota"
import { buildCoverLetterDocx, slugify } from "./coverLetterDocx"

type AnalysisGap = { skill?: string; type?: string; severity?: string }

/**
 * Buat cover letter (kuota + guardrail diurus di sini).
 *
 * Berbeda dengan analisis, surat TIDAK di-cache: parameter tone/panjang/bahasa
 * membuat tiap permintaan memang bermaksud menghasilkan surat yang berbeda,
 * dan hasilnya disimpan permanen sebagai artefak milik user (tanpa versioning —
 * regenerate = baris baru yang berdiri sendiri).
 */
export async function createCoverLetter(
  args: GenerateCoverLetterInput & { userId: string },
) {
  const [cv, job] = await Promise.all([
    getCv(args.userId, args.cvId),
    getJob(args.userId, args.jobPostingId),
  ])

  // Konteks analisis bersifat OPSIONAL — surat tetap bisa dibuat dari CV + lowongan saja.
  let analysisContext
  let analysisId: string | null = null
  if (args.analysisId) {
    const analysis = await prisma.analysis.findFirst({
      where: { id: args.analysisId, userId: args.userId },
    })
    if (!analysis) throw notFound("Analisis")
    const suggestions = analysis.suggestionsJson as { careerNote?: string } | null
    const gaps = (analysis.gapsJson as AnalysisGap[] | null) ?? []
    analysisId = analysis.id
    analysisContext = {
      matchScore: analysis.matchScore,
      careerNote: suggestions?.careerNote ?? "",
      gaps: gaps.map((gap) => ({
        skill: gap.skill ?? "",
        type: gap.type ?? "real",
        severity: gap.severity ?? "must",
      })),
    }
  }

  const parsedJob = jobParsedSchema.parse(job.parsedJson)

  await consumeCoverLetterQuota(args.userId) // 429 QUOTA_EXCEEDED bila habis

  let result
  try {
    result = await generateCoverLetter({
      cv: cvStructuredSchema.parse(cv.structuredJson),
      job: parsedJob,
      language: args.language,
      tone: args.tone,
      length: args.length,
      analysis: analysisContext,
    })
  } catch (error) {
    // Gagal total = user tidak dapat apa-apa, jadi kuotanya dikembalikan.
    await refundCoverLetterQuota(args.userId).catch(() => {})
    if (error instanceof EmptyCoverLetterError) {
      logger.warn({ reasons: error.reasons }, "cover letter ditolak guardrail sepenuhnya")
      throw new HttpError(
        422,
        "COVER_LETTER_UNVERIFIABLE",
        "Surat batal dibuat karena isinya tidak bisa dibuktikan dari CV kamu. Lengkapi dulu pengalaman & skill di CV, lalu coba lagi.",
      )
    }
    throw error
  }

  const positionLabel = parsedJob.jobTitle || "Posisi"
  const companyLabel = parsedJob.company ? ` — ${parsedJob.company}` : ""

  return prisma.coverLetter.create({
    data: {
      userId: args.userId,
      cvId: cv.id,
      jobPostingId: job.id,
      analysisId,
      title: `${positionLabel}${companyLabel}`,
      language: result.language,
      tone: result.tone,
      length: result.length,
      bodyText: result.text,
      draftJson: result.draft,
      rejectedJson: result.rejectedParagraphs,
      engineVersion: result.engineVersion || COVER_LETTER_ENGINE_VERSION,
    },
  })
}

export async function listCoverLetters(userId: string) {
  return prisma.coverLetter.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      language: true,
      tone: true,
      length: true,
      createdAt: true,
    },
  })
}

export async function getCoverLetter(userId: string, id: string) {
  const letter = await prisma.coverLetter.findFirst({ where: { id, userId } })
  if (!letter) throw notFound("Cover letter")
  return letter
}

export async function deleteCoverLetter(userId: string, id: string) {
  await getCoverLetter(userId, id) // ownership check
  await prisma.coverLetter.delete({ where: { id } })
}

export type CoverLetterExport = {
  buffer: Buffer
  contentType: string
  filename: string
}

/** TXT & DOCX selalu tersedia; PDF butuh Gotenberg (graceful 503 bila mati). */
export async function exportCoverLetter(
  userId: string,
  id: string,
  format: CoverLetterExportFormat,
): Promise<CoverLetterExport> {
  const letter = await getCoverLetter(userId, id)
  const slug = slugify(letter.title)
  const base = `${slug}-cover-letter-dilirik`

  if (format === "txt") {
    return {
      buffer: Buffer.from(letter.bodyText, "utf8"),
      contentType: "text/plain; charset=utf-8",
      filename: `${base}.txt`,
    }
  }

  const docx = await buildCoverLetterDocx({ bodyText: letter.bodyText })

  if (format === "docx") {
    return {
      buffer: docx,
      contentType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      filename: `${base}.docx`,
    }
  }

  if (!gotenbergEnabled()) {
    throw new HttpError(
      503,
      "PDF_UNAVAILABLE",
      "Unduh PDF belum tersedia (konversi dokumen nonaktif). Silakan unduh versi Word atau teks.",
    )
  }
  try {
    const pdf = await convertDocxToPdf(docx, `${base}.docx`)
    return { buffer: pdf, contentType: "application/pdf", filename: `${base}.pdf` }
  } catch (err) {
    logger.warn({ err }, "konversi cover letter DOCX→PDF gagal")
    throw new HttpError(
      503,
      "PDF_UNAVAILABLE",
      "Konversi PDF sedang bermasalah. Silakan coba lagi atau unduh versi Word.",
    )
  }
}
