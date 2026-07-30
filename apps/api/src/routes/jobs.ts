import { Router } from "express"
import { createJobSchema } from "@dilirik/shared"
import { requireAuth } from "../middleware/requireAuth"
import { rateLimit } from "../middleware/rateLimit"
import * as jobService from "../services/jobService"

export const jobsRouter: Router = Router()
jobsRouter.use(requireAuth)

jobsRouter.get("/", async (req, res, next) => {
  try {
    res.json({ jobs: await jobService.listJobs(req.userId!) })
  } catch (e) { next(e) }
})

jobsRouter.post("/", rateLimit("job-create", 10, 60), async (req, res, next) => {
  try {
    const input = createJobSchema.parse(req.body)
    const job = await jobService.createJob({ userId: req.userId!, ...input })
    res.status(201).json({ job })
  } catch (e) { next(e) }
})

jobsRouter.get("/:id", async (req, res, next) => {
  try {
    res.json({ job: await jobService.getJob(req.userId!, req.params.id!) })
  } catch (e) { next(e) }
})

jobsRouter.delete("/:id", async (req, res, next) => {
  try {
    await jobService.deleteJob(req.userId!, req.params.id!)
    res.status(204).end()
  } catch (e) { next(e) }
})
