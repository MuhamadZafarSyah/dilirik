"use client"

import { useEffect } from "react"
import posthog from "posthog-js"
import { useConsent } from "@/hooks/use-consent"
import {
  posthogHost,
  posthogKey,
  posthogTracingHeaders,
} from "@/lib/analytics/config"
import { registerAnalyticsCapture } from "@/lib/analytics/track"
import { useSession } from "@/lib/auth-client"

/**
 * Penjaga init agar `posthog.init` tidak pernah dipanggil dua kali (Strict Mode
 * memasang effect dua kali di development).
 */
let initialized = false

/**
 * Menginisialisasi PostHog HANYA setelah consent diberikan.
 */
export function PostHogProvider() {
  const { consent } = useConsent()
  const { data: session } = useSession()

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && !posthogKey) {
      console.error(
        "NEXT_PUBLIC_POSTHOG_KEY variable required by PostHog is missing or un-configured, " +
        "this causes events to be silently missed. This error stops appearing once " +
        "NEXT_PUBLIC_POSTHOG_KEY is configured"
      )
    }
    if (!posthogKey || consent !== "granted") return

    if (!initialized) {
      posthog.init(posthogKey, {
        // Route through Next.js reverse proxy to avoid ad blockers
        api_host: "/ingest",
        ui_host: posthogHost,
        defaults: "2026-01-30",
        // Hanya buat profil orang untuk pengguna yang teridentifikasi
        person_profiles: "identified_only",
        capture_pageview: true,
        capture_pageleave: true,
        capture_exceptions: true,
        ...(posthogTracingHeaders
          ? { tracing_headers: [posthogTracingHeaders] }
          : {}),
      })
      initialized = true
    }

    registerAnalyticsCapture((name, properties) => {
      posthog.capture(name, properties)
    })

    return () => registerAnalyticsCapture(null)
  }, [consent])

  // Session identity is persisted by posthog-js after this call.
  useEffect(() => {
    if (consent !== "granted" || !initialized || !session?.user?.id) return

    posthog.identify(session.user.id, {
      email: session.user.email,
      name: session.user.name,
    })
  }, [consent, session?.user?.id, session?.user?.email, session?.user?.name])

  return null
}
