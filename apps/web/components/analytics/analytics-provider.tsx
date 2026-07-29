import { ConsentBanner } from "@/components/analytics/consent-banner"
import { GoogleAnalytics } from "@/components/analytics/google-analytics"
import { PostHogProvider } from "@/components/analytics/posthog-provider"
import { WebVitals } from "@/components/analytics/web-vitals"
import {
  isAnalyticsEnabled,
  isGoogleAnalyticsEnabled,
  isPostHogEnabled,
} from "@/lib/analytics/config"

/**
 * Satu titik pemasangan analytics untuk root layout.
 *
 * Bila tidak ada env analytics yang di-set, komponen ini tidak merender apa pun
 * — termasuk banner consent. Tidak ada data yang dikumpulkan berarti tidak ada
 * izin yang perlu diminta, dan pengembangan lokal tetap bersih.
 */
export function AnalyticsProvider() {
  if (!isAnalyticsEnabled) return null

  return (
    <>
      {isGoogleAnalyticsEnabled ? <GoogleAnalytics /> : null}
      {isPostHogEnabled ? <PostHogProvider /> : null}
      <WebVitals />
      <ConsentBanner />
    </>
  )
}
