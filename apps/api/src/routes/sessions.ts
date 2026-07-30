import { Router } from "express"
import { updateSessionSchema } from "@dilirik/shared"
import { requireAuth } from "../middleware/requireAuth"
import * as sessionService from "../services/sessionService"

/**
 * Sesi analisis 1-alur (wizard) — progres tersimpan otomatis sebagai draft
 * yang bisa dilanjutkan (Flow B versi sesi-utuh).
 */
export const sessionsRouter: Router = Router()
sessionsRouter.use(requireAuth)

sessionsRouter.get("/", async (req, res, next) => {
  try {
    res.json({ sessions: await sessionService.listSessions(req.userId!) })
  } catch (e) { next(e) }
})

sessionsRouter.post("/", async (req, res, next) => {
  try {
    res.status(201).json({ session: await sessionService.createSession(req.userId!) })
  } catch (e) { next(e) }
})

sessionsRouter.get("/:id", async (req, res, next) => {
  try {
    res.json({ session: await sessionService.getSession(req.userId!, req.params.id!) })
  } catch (e) { next(e) }
})

sessionsRouter.patch("/:id", async (req, res, next) => {
  try {
    const input = updateSessionSchema.parse(req.body)
    res.json({ session: await sessionService.updateSession(req.userId!, req.params.id!, input) })
  } catch (e) { next(e) }
})

sessionsRouter.delete("/:id", async (req, res, next) => {
  try {
    await sessionService.deleteSession(req.userId!, req.params.id!)
    res.status(204).end()
  } catch (e) { next(e) }
})
