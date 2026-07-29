"use client"

import { useEffect } from "react"
import posthog from "posthog-js"
import { useConsent } from "@/hooks/use-consent"
import { posthogKey } from "@/lib/analytics/config"
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
        ui_host: "https://us.posthog.com",
        defaults: "2026-01-30",
        // Hanya buat profil orang untuk pengguna yang teridentifikasi
        person_profiles: "identified_only",
        capture_pageview: true,
        capture_pageleave: true,
        capture_exceptions: true,
      })
      initialized = true
    }

    registerAnalyticsCapture((name, properties) => {
      posthog.capture(name, properties)
    })

    return () => registerAnalyticsCapture(null)
  }, [consent])

  // Identify authenticated user whenever session or consent changes
  useEffect(() => {
    if (consent !== "granted" || !initialized) return
    if (session?.user?.id) {
      posthog.identify(session.user.id, {
        name: session.user.name,
      })
    }
  }, [consent, session])

  return null
}
