import { Router } from "express"
import { z } from "zod"
import { requireAuth } from "../middleware/requireAuth"
import { rateLimit } from "../middleware/rateLimit"
import { gotenbergEnabled, warmUpGotenberg } from "../lib/gotenberg"
import * as previewService from "../services/previewService"

export const previewRouter: Router = Router()
previewRouter.use(requireAuth)

// Status fitur preview desain. Sekaligus warm-up Gotenberg (fire-and-forget)
// supaya instance scale-to-zero sudah hangat sebelum user klik "Terapkan".
previewRouter.get("/status", async (_req, res, next) => {
  try {
    if (gotenbergEnabled()) warmUpGotenberg()
    res.json({ enabled: gotenbergEnabled() })
  } catch (e) { next(e) }
})

// PDF file desain ASLI ("Before") — PDF passthrough, DOCX dikonversi
previewRouter.get("/cv/:id", rateLimit("preview-original", 30, 60), async (req, res, next) => {
  try {
    const id = req.params.id as string
    const pdf = await previewService.getOriginalPdfPreview(req.userId!, id)
    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Cache-Control", "private, max-age=300")
    res.send(pdf)
  } catch (e) { next(e) }
})

// PDF hasil revisi ("After") — murni preview, tidak menyimpan versi/file apa pun.
// `highlight: true` menyorot teks pengganti (stabilo kuning ala Word) — hanya
// memengaruhi preview ini; file final dari flow apply TIDAK pernah disorot.
const revisedPreviewSchema = z.object({
  replacements: z
    .array(z.object({ before: z.string().min(1).max(2000), after: z.string().min(1).max(2000) }))
    .min(1)
    .max(50),
  highlight: z.boolean().optional().default(false),
})
previewRouter.post("/cv/:id/revised", rateLimit("preview-revised", 20, 60), async (req, res, next) => {
  try {
    const id = req.params.id as string
    const { replacements, highlight } = revisedPreviewSchema.parse(req.body)
    const result = await previewService.getRevisedPdfPreview(req.userId!, id, replacements, { highlight })
    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Access-Control-Expose-Headers", "X-Preview-Applied, X-Preview-Skipped")
    res.setHeader("X-Preview-Applied", String(result.appliedCount))
    res.setHeader("X-Preview-Skipped", String(result.skippedCount))
    res.send(result.pdf)
  } catch (e) { next(e) }
})
