import * as Sentry from "@sentry/node"
import { createApp } from "./app"
import { env } from "./lib/env"
import { logger } from "./lib/logger"

if (env.SENTRY_DSN) {
  Sentry.init({ dsn: env.SENTRY_DSN, environment: env.NODE_ENV })
}

const app = createApp()

if (env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app)
}

app.listen(env.PORT, () => {
  logger.info(`👀 Dilirik API listening on http://localhost:${env.PORT}`)
})
