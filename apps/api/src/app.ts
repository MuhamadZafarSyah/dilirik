import express from "express"
import cors from "cors"
import helmet from "helmet"
import { pinoHttp } from "pino-http"
import { toNodeHandler } from "better-auth/node"
import { auth } from "./lib/auth"
import { env } from "./lib/env"
import { logger } from "./lib/logger"
import { errorHandler } from "./middleware/errorHandler"
import { cvRouter } from "./routes/cv"
import { jobsRouter } from "./routes/jobs"
import { applicationsRouter } from "./routes/applications"
import { analyzeRouter } from "./routes/analyze"
import { sessionsRouter } from "./routes/sessions"
import { dashboardRouter } from "./routes/dashboard"
import { settingsRouter } from "./routes/settings"

export function createApp() {
  const app = express()
  app.use(helmet())
  app.use(cors({ origin: env.CORS_ORIGIN.split(","), credentials: true }))
  app.use(pinoHttp({ logger }))

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "dilirik-api" })
  })

  // Better Auth handler HARUS sebelum express.json()
  app.all("/api/auth/*", toNodeHandler(auth))

  app.use(express.json({ limit: "2mb" }))

  app.use("/api/cv", cvRouter)
  app.use("/api/jobs", jobsRouter)
  app.use("/api/applications", applicationsRouter)
  app.use("/api/analyze", analyzeRouter)
  app.use("/api/sessions", sessionsRouter)
  app.use("/api/dashboard", dashboardRouter)
  app.use("/api/settings", settingsRouter)

  app.use(errorHandler)
  return app
}
