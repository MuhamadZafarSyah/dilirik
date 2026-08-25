import {
  createJobAlertSchema,
  discoverySearchSchema,
  dismissJobMatchSchema,
  updateSearchProfileSchema,
} from "@dilirik/shared"
import { Router } from "express"
import { rateLimit } from "../middleware/rateLimit.js"
import { requireAuth } from "../middleware/requireAuth.js"
import {
  dismissMatch,
  getDiscoveryStatus,
  getOrCreateSearchProfile,
  getRun,
  listRuns,
  prepareMatchAnalysis,
  requestAlert,
  saveMatch,
  unsaveMatch,
  searchJobs,
  updateSearchProfile,
} from "../services/discoveryService.js"

/** Endpoint fitur Cari Lowongan (PRD Cari Lowongan §14). */
export const discoveryRouter: Router = Router()

discoveryRouter.use(requireAuth)

/**
 * Pencarian adalah satu-satunya endpoint di sini yang memakan kuota dan
 * memanggil LLM, jadi hanya ini yang dibatasi ketat. Aksi lain (lihat riwayat,
 * simpan, sembunyikan) harus terasa gratis dan instan.
 */
discoveryRouter.post(
  "/search",
  rateLimit("discovery-search", 5, 60),
  async (req, res, next) => {
    try {
      const input = discoverySearchSchema.parse(req.body)
      const result = await searchJobs(req.userId!, input)
      res.status(201).json(result)
    } catch (e) {
      next(e)
    }
  },
)

discoveryRouter.get("/profile", async (req, res, next) => {
  try {
    const cvId = req.query.cvId as string | undefined
    if (!cvId) {
      res.status(400).json({ error: "VALIDATION_ERROR", message: "cvId wajib diisi" })
      return
    }
    const profile = await getOrCreateSearchProfile(req.userId!, cvId)
    res.json({ profile })
  } catch (e) {
    next(e)
  }
})

discoveryRouter.put("/profile/:id", async (req, res, next) => {
  try {
    const input = updateSearchProfileSchema.parse(req.body)
    const profile = await updateSearchProfile(req.userId!, req.params.id as string, input)
    res.json({ profile })
  } catch (e) {
    next(e)
  }
})

discoveryRouter.get("/runs", async (req, res, next) => {
  try {
    const runs = await listRuns(req.userId!)
    res.json({ runs })
  } catch (e) {
    next(e)
  }
})

discoveryRouter.get("/runs/:id", async (req, res, next) => {
  try {
    const run = await getRun(req.userId!, req.params.id as string)
    res.json(run)
  } catch (e) {
    next(e)
  }
})

discoveryRouter.post("/matches/:id/save", async (req, res, next) => {
  try {
    const match = await saveMatch(req.userId!, req.params.id as string)
    res.json({ match })
  } catch (e) {
    next(e)
  }
})

discoveryRouter.post("/matches/:id/unsave", async (req, res, next) => {
  try {
    const match = await unsaveMatch(req.userId!, req.params.id as string)
    res.json({ match })
  } catch (e) {
    next(e)
  }
})

discoveryRouter.post("/matches/:id/dismiss", async (req, res, next) => {
  try {
    const input = dismissJobMatchSchema.parse(req.body)
    const match = await dismissMatch(req.userId!, req.params.id as string, input)
    res.json({ match })
  } catch (e) {
    next(e)
  }
})

/**
 * Tidak menjalankan analisis di sini. Endpoint ini hanya menyiapkan JobPosting
 * dari snippet lalu menyerahkan ke alur analisis yang sudah ada — termasuk kuota
 * analisisnya. Dengan begitu tidak ada jalur pintas yang melewati kuota analisis.
 */
discoveryRouter.post("/matches/:id/analyze", async (req, res, next) => {
  try {
    const result = await prepareMatchAnalysis(req.userId!, req.params.id as string)
    res.status(201).json(result)
  } catch (e) {
    next(e)
  }
})

discoveryRouter.post("/alerts", async (req, res, next) => {
  try {
    const input = createJobAlertSchema.parse(req.body)
    await requestAlert(req.userId!, input.pendingQueryId)
    res.status(201).json({ ok: true })
  } catch (e) {
    next(e)
  }
})

discoveryRouter.get("/status", async (req, res, next) => {
  try {
    const status = await getDiscoveryStatus(req.userId!)
    res.json(status)
  } catch (e) {
    next(e)
  }
})
