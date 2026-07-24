import { Router } from "express"
import { runAnalysisSchema } from "@dilirik/shared"
import { z } from "zod"
import { requireAuth } from "../middleware/requireAuth"
import { rateLimit } from "../middleware/rateLimit"
import { HttpError } from "../middleware/errorHandler"
import * as analysisService from "../services/analysisService"
import * as cvService from "../services/cvService"
import { checkEntitlement } from "../services/quota"

export const analyzeRouter = Router()
analyzeRouter.use(requireAuth)

// Sisa kuota (Flow E: selalu terlihat di dashboard & header)
analyzeRouter.get("/quota", async (req, res, next) => {
  try {
    const e = await checkEntitlement(req.userId!)
    res.json({ quota: e.quota, used: e.used, remaining: e.remaining, resetAt: e.resetAt.toISOString() })
  } catch (e) { next(e) }
})

// Jalankan analisis (kuota + cache diurus service)
analyzeRouter.post("/", rateLimit("analyze", 6, 60), async (req, res, next) => {
  try {
    const input = runAnalysisSchema.parse(req.body)
    const { analysis, cached } = await analysisService.runAnalysis({ userId: req.userId!, ...input })
    res.status(201).json({ analysis, cached })
  } catch (e) { next(e) }
})

analyzeRouter.get("/:id", async (req, res, next) => {
  try {
    res.json({ analysis: await analysisService.getAnalysis(req.userId!, req.params.id!) })
  } catch (e) { next(e) }
})

// "Terapkan saran" (Flow C): TIMPA teks CV → tersimpan sebagai VERSI BARU — versi lama tetap ada
const applySchema = z.object({ newRawText: z.string().min(50) })
analyzeRouter.post("/:id/apply", async (req, res, next) => {
  try {
    const analysis = await analysisService.getAnalysis(req.userId!, req.params.id!)
    const { newRawText } = applySchema.parse(req.body)

    // Guard anti "versi kembar" (fix bug compare identik):
    // teks harus benar-benar berubah sebelum boleh disimpan sebagai versi baru.
    const source = await cvService.getCv(req.userId!, analysis.cvId)
    const squash = (t: string) => t.replace(/\s+/g, " ").trim()
    if (squash(newRawText) === squash(source.rawText)) {
      throw new HttpError(
        400,
        "NO_CHANGES",
        "Teks CV belum berubah — terapkan minimal satu revisi dulu sebelum menyimpan versi baru",
      )
    }

    const newCv = await cvService.createCvVersion({
      userId: req.userId!,
      sourceCvId: analysis.cvId,
      newRawText,
    })
    res.status(201).json({ cv: newCv })
  } catch (e) { next(e) }
})
