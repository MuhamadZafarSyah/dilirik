import { ingestRequestSchema } from "@dilirik/shared"
import { Router } from "express"
import { env } from "../lib/env.js"
import { HttpError } from "../middleware/errorHandler.js"
import { rateLimit } from "../middleware/rateLimit.js"
import { runIngestion } from "../services/ingestionService.js"

/**
 * Endpoint internal untuk penjadwal (PRD Cari Lowongan §8.3).
 *
 * Sengaja TIDAK memakai requireAuth: pemanggilnya adalah cron, bukan manusia
 * yang punya sesi. Pengamanannya secret di header.
 *
 * Kalau DISCOVERY_INGEST_SECRET tidak diisi, endpoint ini mati total — bukan
 * terbuka. Default yang aman lebih penting daripada kemudahan setup.
 */
export const internalRouter: Router = Router()

internalRouter.post("/ingest", rateLimit("internal-ingest", 4, 3600), async (req, res, next) => {
  try {
    const secret = env.DISCOVERY_INGEST_SECRET
    if (!secret) {
      throw new HttpError(
        503,
        "INGEST_DISABLED",
        "Ingestion belum diaktifkan: DISCOVERY_INGEST_SECRET belum diisi",
      )
    }

    const provided = req.header("x-ingest-secret")
    if (provided !== secret) {
      throw new HttpError(401, "UNAUTHORIZED", "Secret ingestion tidak valid")
    }

    const input = ingestRequestSchema.parse(req.body ?? {})
    const summary = await runIngestion({
      trigger: input.trigger,
      maxCompanies: input.maxCompanies,
      maxAggregatorQueries: input.maxAggregatorQueries,
      dryRun: input.dryRun,
    })

    res.status(201).json(summary)
  } catch (e) {
    next(e)
  }
})
