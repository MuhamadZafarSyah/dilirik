"use client"

import { useEffect } from "react"
import posthog from "posthog-js"
import { useConsent } from "@/hooks/use-consent"
import { posthogHost, posthogKey } from "@/lib/analytics/config"
import { registerAnalyticsCapture } from "@/lib/analytics/track"

/**
 * Penjaga init agar `posthog.init` tidak pernah dipanggil dua kali (Strict Mode
 * memasang effect dua kali di development).
 */
let initialized = false

/**
 * Menginisialisasi PostHog HANYA setelah consent diberikan.
 *
 * Catatan: `posthog-js` sudah lama terdaftar sebagai dependency di repo ini tapi
 * belum pernah dipakai. Di sinilah paket itu akhirnya berfungsi.
 */
export function PostHogProvider() {
  const { consent } = useConsent()

  useEffect(() => {
    if (!posthogKey || consent !== "granted") return

    if (!initialized) {
      posthog.init(posthogKey, {
        api_host: posthogHost,
        // Hanya buat profil orang untuk pengguna yang teridentifikasi — kunjungan
        // anonim tetap terhitung tanpa menciptakan profil sampah.
        person_profiles: "identified_only",
        capture_pageview: true,
        capture_pageleave: true,
      })
      initialized = true
    }

    registerAnalyticsCapture((name, properties) => {
      posthog.capture(name, properties)
    })

    return () => registerAnalyticsCapture(null)
  }, [consent])

  return null
}
