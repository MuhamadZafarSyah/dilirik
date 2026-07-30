import { Router } from "express"
import { runAnalysisSchema } from "@dilirik/shared"
import { z } from "zod"
import { requireAuth } from "../middleware/requireAuth"
import { rateLimit } from "../middleware/rateLimit"
import { HttpError } from "../middleware/errorHandler"
import { getCvFile, storeCvFile } from "../lib/storage"
import { reviseDocx } from "../services/docxRevise"
import * as analysisService from "../services/analysisService"
import * as cvService from "../services/cvService"
import { checkEntitlement } from "../services/quota"

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

export const analyzeRouter: Router = Router()
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

    // ===== Fase 1b — jalur DOCX native (best-effort, TIDAK boleh menggagalkan apply) =====
    // Sumber kebenaran tetap rawText; file DOCX hanyalah render target.
    // Saran dianggap "diterapkan user" bila teks `after`-nya ada di newRawText.
    let designFileKey: string | null = null
    try {
      if (source.fileKey?.toLowerCase().endsWith(".docx")) {
        const original = await getCvFile(source.fileKey)
        const sj = analysis.suggestionsJson as
          | { suggestions?: Array<{ before?: string; after?: string }> }
          | null
        const appliedNow = (sj?.suggestions ?? [])
          .filter((s) => Boolean(s.before && s.after) && squash(newRawText).includes(squash(s.after!)))
          .map((s) => ({ before: s.before!, after: s.after! }))
        if (original && appliedNow.length > 0) {
          const revised = await reviseDocx({ buffer: original.buffer, replacements: appliedNow })
          if (revised.applied.length > 0) {
            designFileKey = await storeCvFile({
              userId: req.userId!,
              buffer: revised.buffer,
              contentType: DOCX_MIME,
              originalName: `${newCv.title}-v${newCv.version}.docx`,
            })
            if (designFileKey) {
              await cvService.setCvFileKey(req.userId!, newCv.id, designFileKey)
            }
          }
        }
      }
    } catch {
      designFileKey = null // revisi desain gagal — versi teks tetap tersimpan
    }

    const cvOut = designFileKey ? { ...newCv, fileKey: designFileKey } : newCv
    res.status(201).json({ cv: cvOut, designFilePreserved: Boolean(designFileKey) })
  } catch (e) { next(e) }
})
