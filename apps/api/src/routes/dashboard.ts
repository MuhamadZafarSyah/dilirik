import { Router } from "express"
import { requireAuth } from "../middleware/requireAuth"
import { getDashboard } from "../services/dashboardService"

export const dashboardRouter = Router()
dashboardRouter.use(requireAuth)

dashboardRouter.get("/", async (req, res, next) => {
  try {
    res.json(await getDashboard(req.userId!))
  } catch (e) { next(e) }
})
