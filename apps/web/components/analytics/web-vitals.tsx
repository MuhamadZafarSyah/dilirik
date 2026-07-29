"use client"

import { useReportWebVitals } from "next/web-vitals"
import { trackWebVital } from "@/lib/analytics/track"

/**
 * Melaporkan Core Web Vitals dari perangkat pengguna sungguhan (field data).
 *
 * Ini melengkapi Lighthouse CI, bukan menggantikannya: Lighthouse mengukur di
 * lab dengan jaringan simulasi, sedangkan angka yang dipakai Google untuk
 * peringkat adalah data lapangan seperti ini.
 */
export function WebVitals() {
  useReportWebVitals((metric) => {
    trackWebVital({
      name: metric.name,
      value: metric.value,
      id: metric.id,
      rating: "rating" in metric ? String(metric.rating) : undefined,
    })
  })

  return null
}
