import { prisma } from "@dilirik/db"
import { generateCoverLetter, countWords } from "@dilirik/ai"
import type { GenerateCoverLetterInput, UpdateCoverLetterInput } from "@dilirik/shared"
import { HttpError } from "../middleware/errorHandler.js"
import { checkCoverLetterEntitlement, consumeCoverLetterQuota } from "./coverLetterQuota.js"
import { detectLanguage } from "./detectLanguage.js"
import { generateCoverLetterDocx } from "./docxCoverLetter.js"
import { convertDocxToPdf } from "../lib/gotenberg.js"

function parseJsonArray(val: unknown): string[] {
  if (!val) return []
  if (Array.isArray(val)) return val.map(String)
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val)
      return Array.isArray(parsed) ? parsed.map(String) : []
    } catch {
      return []
    }
  }
  return []
}

export async function generateCoverLetterService(
  userId: string,
  input: GenerateCoverLetterInput,
) {
  // 1. Quota Check
  const entitlement = await checkCoverLetterEntitlement(userId)
  if (!entitlement.allowed) {
    throw new HttpError(
      429,
      "COVER_LETTER_QUOTA_EXCEEDED",
      "Kuota pembuatan surat lamaran gratis bulan ini telah habis",
    )
  }

  // 2. Fetch CV
  const cv = await prisma.cv.findFirst({
    where: { id: input.cvId, userId },
  })
  if (!cv) {
    throw new HttpError(404, "CV_NOT_FOUND", "CV tidak ditemukan")
  }

  // 3. Fetch Job Posting
  const job = await prisma.jobPosting.findFirst({
    where: { id: input.jobPostingId, userId },
  })
  if (!job) {
    throw new HttpError(404, "JOB_NOT_FOUND", "Lowongan pekerjaan tidak ditemukan")
  }

  // 4. Fetch Analysis (Optional)
  let analysisScore: number | undefined
  let analysisGaps: string[] | undefined
  let analysisSuggestions: string[] | undefined

  if (input.analysisId) {
    const analysis = await prisma.analysis.findFirst({
      where: { id: input.analysisId, userId },
    })
    if (analysis) {
      analysisScore = analysis.matchScore
      analysisGaps = parseJsonArray(analysis.gapsJson)
      analysisSuggestions = parseJsonArray(analysis.suggestionsJson)
    }
  }

  // 5. Language detection / fallback
  const lang = (input.language || detectLanguage(job.rawText)) === "en" ? "en" : "id"

  // 6. Call AI Pipeline
  const aiResult = await generateCoverLetter({
    cvText: cv.rawText,
    cvTitle: cv.title,
    jobText: job.rawText,
    analysisScore,
    analysisGaps,
    analysisSuggestions,
    language: lang,
    template: input.template ?? "professional",
    customInstructions: input.customInstructions,
  })

  // 7. Store Cover Letter in DB
  const coverLetter = await prisma.coverLetter.create({
    data: {
      userId,
      cvId: cv.id,
      jobPostingId: job.id,
      analysisId: input.analysisId ?? null,
      text: aiResult.text,
      language: lang,
      template: input.template ?? "professional",
      customInstructions: input.customInstructions ?? null,
      relevanceScore: aiResult.relevanceScore,
      wordCount: aiResult.wordCount,
    },
    include: {
      cv: { select: { id: true, title: true } },
      jobPosting: { select: { id: true, parsedJson: true } },
      analysis: { select: { id: true, matchScore: true } },
    },
  })

  // 8. Consume Quota
  await consumeCoverLetterQuota(userId)

  return coverLetter
}

export async function listCoverLettersService(userId: string) {
  return prisma.coverLetter.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      cv: { select: { id: true, title: true } },
      jobPosting: { select: { id: true, parsedJson: true } },
      analysis: { select: { id: true, matchScore: true } },
    },
  })
}

export async function getCoverLetterByIdService(userId: string, id: string) {
  const coverLetter = await prisma.coverLetter.findFirst({
    where: { id, userId },
    include: {
      cv: { select: { id: true, title: true, rawText: true } },
      jobPosting: { select: { id: true, rawText: true, parsedJson: true } },
      analysis: { select: { id: true, matchScore: true, gapsJson: true, suggestionsJson: true } },
    },
  })

  if (!coverLetter) {
    throw new HttpError(404, "COVER_LETTER_NOT_FOUND", "Surat lamaran tidak ditemukan")
  }

  return coverLetter
}

export async function updateCoverLetterService(
  userId: string,
  id: string,
  input: UpdateCoverLetterInput,
) {
  const existing = await prisma.coverLetter.findFirst({
    where: { id, userId },
  })

  if (!existing) {
    throw new HttpError(404, "COVER_LETTER_NOT_FOUND", "Surat lamaran tidak ditemukan")
  }

  const newText = input.text ?? existing.text
  const wordCount = countWords(newText)

  return prisma.coverLetter.update({
    where: { id },
    data: {
      text: newText,
      template: input.template ?? existing.template,
      customInstructions:
        input.customInstructions !== undefined
          ? input.customInstructions
          : existing.customInstructions,
      wordCount,
    },
    include: {
      cv: { select: { id: true, title: true } },
      jobPosting: { select: { id: true, parsedJson: true } },
      analysis: { select: { id: true, matchScore: true } },
    },
  })
}

export async function deleteCoverLetterService(userId: string, id: string) {
  const existing = await prisma.coverLetter.findFirst({
    where: { id, userId },
  })

  if (!existing) {
    throw new HttpError(404, "COVER_LETTER_NOT_FOUND", "Surat lamaran tidak ditemukan")
  }

  await prisma.coverLetter.delete({ where: { id } })
  return { success: true }
}

export async function exportCoverLetterTextService(userId: string, id: string) {
  const coverLetter = await getCoverLetterByIdService(userId, id)
  const filename = `Surat_Lamaran_${coverLetter.id.slice(-6)}.txt`
  return { filename, text: coverLetter.text }
}

export async function exportCoverLetterDocxService(userId: string, id: string) {
  const coverLetter = await getCoverLetterByIdService(userId, id)
  const buffer = await generateCoverLetterDocx(coverLetter.text, coverLetter.template ?? "professional")
  const filename = `Surat_Lamaran_${coverLetter.id.slice(-6)}.docx`
  return { filename, buffer }
}

export async function exportCoverLetterPdfService(userId: string, id: string) {
  const coverLetter = await getCoverLetterByIdService(userId, id)
  const docxBuffer = await generateCoverLetterDocx(coverLetter.text, coverLetter.template ?? "professional")
  const filename = `Surat_Lamaran_${coverLetter.id.slice(-6)}.pdf`

  try {
    const pdfBuffer = await convertDocxToPdf(docxBuffer, filename)
    return { filename, buffer: pdfBuffer }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    if (message === "GOTENBERG_DISABLED") {
      throw new HttpError(
        503,
        "GOTENBERG_DISABLED",
        "Layanan konversi PDF (Gotenberg) belum dikonfigurasi. Silakan unduh format DOCX.",
      )
    }
    throw new HttpError(
      500,
      "PDF_CONVERT_FAILED",
      `Gagal mengonversi surat lamaran ke PDF: ${message}`,
    )
  }
}
