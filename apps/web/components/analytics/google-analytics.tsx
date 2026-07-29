import Script from "next/script"
import { gaMeasurementId } from "@/lib/analytics/config"

const GTAG_SCRIPT_BASE_URL = "https://www.googletagmanager.com/gtag/js"

/**
 * Consent Mode v2 — default TOLAK semuanya.
 * `wait_for_update: 500` memberi jeda agar keputusan tersimpan dari kunjungan
 * sebelumnya bisa menyusul sebelum GA memutuskan cara mengirim data.
 */
const consentDefaultSnippet = [
  "window.dataLayer = window.dataLayer || [];",
  "function gtag(){dataLayer.push(arguments);}",
  "gtag('consent', 'default', {",
  "  ad_storage: 'denied',",
  "  ad_user_data: 'denied',",
  "  ad_personalization: 'denied',",
  "  analytics_storage: 'denied',",
  "  wait_for_update: 500",
  "});",
].join("\n")

/**
 * Memuat GA4 tanpa dependency tambahan.
 *
 * Kenapa bukan `@next/third-parties/google`: CI menjalankan
 * `pnpm install --frozen-lockfile`, jadi menambah paket tanpa memperbarui
 * `pnpm-lock.yaml` akan langsung menggagalkan build. Bisa ditukar nanti dengan
 * satu kali `pnpm add @next/third-parties` dan commit lockfile-nya.
 */
export function GoogleAnalytics() {
  if (!gaMeasurementId) return null

  const scriptSrc = GTAG_SCRIPT_BASE_URL + "?id=" + encodeURIComponent(gaMeasurementId)

  const configSnippet = [
    "gtag('js', new Date());",
    "gtag('config', '" + gaMeasurementId + "', { send_page_view: true });",
  ].join("\n")

  return (
    <>
      {/*
        Sengaja memakai <script> biasa, bukan next/script:
        snippet consent WAJIB tereksekusi sebelum gtag.js dimuat. Strategi
        `beforeInteractive` hanya sah di root layout dan urutan antar skrip
        `afterInteractive` tidak dijamin, sedangkan skrip inline biasa dijalankan
        persis sesuai urutan dokumen.
      */}
      <script dangerouslySetInnerHTML={{ __html: consentDefaultSnippet }} />
      <Script src={scriptSrc} strategy="afterInteractive" />
      <Script
        id="ga-config"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: configSnippet }}
      />
    </>
  )
}
