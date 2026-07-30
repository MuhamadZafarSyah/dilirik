import type { Express } from "express"
import * as Sentry from "@sentry/node"
import { createApp } from "../src/app"
import { env } from "../src/lib/env"

if (env.SENTRY_DSN) {
  Sentry.init({ dsn: env.SENTRY_DSN, environment: env.NODE_ENV })
}

const app: Express = createApp()

if (env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app as any)
}

export default app
