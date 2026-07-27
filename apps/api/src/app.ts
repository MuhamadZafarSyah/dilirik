import express from "express"
import cors from "cors"
import helmet from "helmet"
import { pinoHttp } from "pino-http"
import { toNodeHandler } from "better-auth/node"
import { auth } from "./lib/auth"
import { env } from "./lib/env"
import { logger } from "./lib/logger"
import { errorHandler } from "./middleware/errorHandler"
import { rateLimit } from "./middleware/rateLimit"
import { authHardening } from "./middleware/authHardening"
import { originCheck, sanitizeRequest } from "./middleware/security"
import { cvRouter } from "./routes/cv"
import { jobsRouter } from "./routes/jobs"
import { applicationsRouter } from "./routes/applications"
import { analyzeRouter } from "./routes/analyze"
import { sessionsRouter } from "./routes/sessions"
import { dashboardRouter } from "./routes/dashboard"
import { settingsRouter } from "./routes/settings"
import { interviewRouter } from "./routes/interview"
import { previewRouter } from "./routes/preview"

export function createApp() {
  const app = express()

  // Di belakang Cloudflare/reverse-proxy: percayai N hop supaya req.ip = IP asli
  // (dipakai rate limiter) dan deteksi HTTPS untuk cookie `secure` akurat.
  app.set("trust proxy", env.TRUST_PROXY_HOPS)
  app.disable("x-powered-by")

  // Security headers. API hanya menyajikan JSON/file — CSP dikunci total.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'none'"],
          formAction: ["'none'"],
        },
      },
      hsts:
        env.NODE_ENV === "production"
          ? { maxAge: 15552000, includeSubDomains: true }
          : false,
      crossOriginResourcePolicy: { policy: "cross-origin" }, // file download diambil web app (origin berbeda) via CORS
      referrerPolicy: { policy: "no-referrer" },
    }),
  )

  app.use(cors({ origin: env.CORS_ORIGIN.split(","), credentials: true }))
  app.use(pinoHttp({ logger }))

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "dilirik-api" })
  })

  // Lapisan global: batasi laju semua request + tolak write cross-origin asing.
  app.use(rateLimit("global", 300, 60))
  app.use(originCheck)

  // Pengerasan khusus endpoint auth (rate limit ketat + CAPTCHA) —
  // Better Auth handler HARUS sebelum express.json().
  app.use("/api/auth", authHardening)
  app.all("/api/auth/*", toNodeHandler(auth))

  app.use(express.json({ limit: "2mb" }))
  app.use(sanitizeRequest)

  app.use("/api/cv", cvRouter)
  app.use("/api/jobs", jobsRouter)
  app.use("/api/applications", applicationsRouter)
  app.use("/api/analyze", analyzeRouter)
  app.use("/api/sessions", sessionsRouter)
  app.use("/api/dashboard", dashboardRouter)
  app.use("/api/settings", settingsRouter)
  app.use("/api/interview", interviewRouter)
  app.use("/api/preview", previewRouter)

  // 404 JSON konsisten (tanpa bocor stack/HTML default Express)
  app.use((_req, res) => {
    res.status(404).json({ error: "NOT_FOUND", message: "Endpoint tidak ditemukan" })
  })

  app.use(errorHandler)
  return app
}
