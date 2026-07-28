import { Router } from "express"
import {
  COVER_LETTER_EXPORT_FORMATS,
  generateCoverLetterSchema,
  type CoverLetterExportFormat,
} from "@dilirik/shared"
import { requireAuth } from "../middleware/requireAuth"
import { rateLimit } from "../middleware/rateLimit"
import { HttpError } from "../middleware/errorHandler"
import { checkCoverLetterEntitlement } from "../services/coverLetterQuota"
import * as coverLetterService from "../services/coverLetterService"

export const coverLetterRouter = Router()
coverLetterRouter.use(requireAuth)

// Sisa kuota cover letter (dipakai UI untuk menonaktifkan tombol sebelum user terlanjur menulis)
coverLetterRouter.get("/quota", async (req, res, next) => {
  try {
    const e = await checkCoverLetterEntitlement(req.userId!)
    res.json({
      quota: e.quota,
      used: e.used,
      remaining: e.remaining,
      resetAt: e.resetAt.toISOString(),
    })
  } catch (e) { next(e) }
})

coverLetterRouter.get("/", async (req, res, next) => {
  try {
    res.json({ coverLetters: await coverLetterService.listCoverLetters(req.userId!) })
  } catch (e) { next(e) }
})

// Generate surat — 1x panggilan LLM, rate limit sekelas /api/analyze
coverLetterRouter.post("/", rateLimit("cover-letter", 6, 60), async (req, res, next) => {
  try {
    const input = generateCoverLetterSchema.parse(req.body)
    const coverLetter = await coverLetterService.createCoverLetter({
      userId: req.userId!,
      ...input,
    })
    res.status(201).json({ coverLetter })
  } catch (e) { next(e) }
})

coverLetterRouter.get("/:id", async (req, res, next) => {
  try {
    res.json({
      coverLetter: await coverLetterService.getCoverLetter(req.userId!, req.params.id!),
    })
  } catch (e) { next(e) }
})

// Unduh TXT / DOCX / PDF — PDF lewat Gotenberg supaya identik dengan Word-nya
coverLetterRouter.get(
  "/:id/export/:format",
  rateLimit("cover-letter-export", 20, 60),
  async (req, res, next) => {
    try {
      const format = req.params.format as CoverLetterExportFormat
      if (!COVER_LETTER_EXPORT_FORMATS.includes(format)) {
        throw new HttpError(400, "UNSUPPORTED_FORMAT", "Format harus txt, docx, atau pdf")
      }
      const file = await coverLetterService.exportCoverLetter(req.userId!, req.params.id!, format)
      res.setHeader("Content-Type", file.contentType)
      res.setHeader("X-Content-Type-Options", "nosniff")
      res.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`)
      res.send(file.buffer)
    } catch (e) { next(e) }
  },
)

coverLetterRouter.delete("/:id", async (req, res, next) => {
  try {
    await coverLetterService.deleteCoverLetter(req.userId!, req.params.id!)
    res.status(204).end()
  } catch (e) { next(e) }
})
