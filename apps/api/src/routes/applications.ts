import { Router } from "express"
import {
  APPLICATION_STATUSES,
  createApplicationSchema,
  updateApplicationSchema,
  type ApplicationStatus,
} from "@dilirik/shared"
import { requireAuth } from "../middleware/requireAuth"
import * as applicationService from "../services/applicationService"

export const applicationsRouter = Router()
applicationsRouter.use(requireAuth)

applicationsRouter.get("/", async (req, res, next) => {
  try {
    const raw = req.query.status as string | undefined
    const status =
      raw && (APPLICATION_STATUSES as readonly string[]).includes(raw)
        ? (raw as ApplicationStatus)
        : undefined
    res.json({ applications: await applicationService.listApplications(req.userId!, status) })
  } catch (e) { next(e) }
})

applicationsRouter.post("/", async (req, res, next) => {
  try {
    const input = createApplicationSchema.parse(req.body)
    const application = await applicationService.createApplication({ userId: req.userId!, ...input })
    res.status(201).json({ application })
  } catch (e) { next(e) }
})

applicationsRouter.get("/:id", async (req, res, next) => {
  try {
    res.json({ application: await applicationService.getApplication(req.userId!, req.params.id!) })
  } catch (e) { next(e) }
})

applicationsRouter.patch("/:id", async (req, res, next) => {
  try {
    const input = updateApplicationSchema.parse(req.body)
    res.json({ application: await applicationService.updateApplication(req.userId!, req.params.id!, input) })
  } catch (e) { next(e) }
})

applicationsRouter.delete("/:id", async (req, res, next) => {
  try {
    await applicationService.deleteApplication(req.userId!, req.params.id!)
    res.status(204).end()
  } catch (e) { next(e) }
})
