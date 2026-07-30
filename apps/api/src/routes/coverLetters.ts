import { Router } from "express"
import { generateCoverLetterSchema, updateCoverLetterSchema } from "@dilirik/shared"
import { requireAuth } from "../middleware/requireAuth.js"
import { rateLimit } from "../middleware/rateLimit.js"
import { checkCoverLetterEntitlement } from "../services/coverLetterQuota.js"
import {
  generateCoverLetterService,
  listCoverLettersService,
  getCoverLetterByIdService,
  updateCoverLetterService,
  deleteCoverLetterService,
  exportCoverLetterTextService,
  exportCoverLetterDocxService,
  exportCoverLetterPdfService,
} from "../services/coverLetterService.js"

export const coverLetterRouter: Router = Router()
coverLetterRouter.use(requireAuth)

// Check cover letter quota
coverLetterRouter.get("/quota", async (req, res, next) => {
  try {
    const e = await checkCoverLetterEntitlement(req.userId!)
    res.json({
      quota: e.quota,
      used: e.used,
      remaining: e.remaining,
      resetAt: e.resetAt.toISOString(),
    })
  } catch (e) {
    next(e)
  }
})

// Generate new cover letter
coverLetterRouter.post(
  "/generate",
  rateLimit("cover-letter-generate", 5, 60),
  async (req, res, next) => {
    try {
      const input = generateCoverLetterSchema.parse(req.body)
      const coverLetter = await generateCoverLetterService(req.userId!, input)
      res.status(201).json({ coverLetter })
    } catch (e) {
      next(e)
    }
  },
)

// List all cover letters
coverLetterRouter.get("/", async (req, res, next) => {
  try {
    const coverLetters = await listCoverLettersService(req.userId!)
    res.json({ coverLetters })
  } catch (e) {
    next(e)
  }
})

// Get detail
coverLetterRouter.get("/:id", async (req, res, next) => {
  try {
    const id = req.params.id as string
    const coverLetter = await getCoverLetterByIdService(req.userId!, id)
    res.json({ coverLetter })
  } catch (e) {
    next(e)
  }
})

// Update
coverLetterRouter.put("/:id", async (req, res, next) => {
  try {
    const id = req.params.id as string
    const input = updateCoverLetterSchema.parse(req.body)
    const coverLetter = await updateCoverLetterService(req.userId!, id, input)
    res.json({ coverLetter })
  } catch (e) {
    next(e)
  }
})

// Delete
coverLetterRouter.delete("/:id", async (req, res, next) => {
  try {
    const id = req.params.id as string
    await deleteCoverLetterService(req.userId!, id)
    res.status(204).end()
  } catch (e) {
    next(e)
  }
})

// Download Plain Text
coverLetterRouter.get("/:id/text", async (req, res, next) => {
  try {
    const id = req.params.id as string
    const { filename, text } = await exportCoverLetterTextService(req.userId!, id)
    res.setHeader("Content-Type", "text/plain; charset=utf-8")
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`)
    res.send(text)
  } catch (e) {
    next(e)
  }
})

// Download DOCX
coverLetterRouter.get("/:id/docx", async (req, res, next) => {
  try {
    const id = req.params.id as string
    const { filename, buffer } = await exportCoverLetterDocxService(req.userId!, id)
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`)
    res.send(buffer)
  } catch (e) {
    next(e)
  }
})

// Download PDF
coverLetterRouter.get("/:id/pdf", async (req, res, next) => {
  try {
    const id = req.params.id as string
    const { filename, buffer } = await exportCoverLetterPdfService(req.userId!, id)
    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`)
    res.send(buffer)
  } catch (e) {
    next(e)
  }
})

