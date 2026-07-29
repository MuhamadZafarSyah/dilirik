/**
 * Konfigurasi analytics dari environment.
 *
 * Semua kunci OPSIONAL: bila kosong, seluruh lapisan analytics mati total dan
 * banner consent tidak muncul (tidak ada cookie = tidak perlu izin). Ini penting
 * agar `pnpm dev` dan CI tidak pernah mengirim data ke mana pun.
 *
 * Ingat: env `NEXT_PUBLIC_*` di-inline saat build. Menambahkannya di dashboard
 * hosting tidak berpengaruh sampai ada redeploy.
 */

function readEnv(value: string | undefined): string | undefined {
	const trimmed = value?.trim()
	return trimmed ? trimmed : undefined
}

/** Measurement ID GA4, format `G-XXXXXXXXXX`. */
export const gaMeasurementId = readEnv(process.env.NEXT_PUBLIC_GA_ID)

export const posthogKey = readEnv(process.env.NEXT_PUBLIC_POSTHOG_KEY)

export const posthogHost =
	readEnv(process.env.NEXT_PUBLIC_POSTHOG_HOST) ?? "https://app.posthog.com"

export const isGoogleAnalyticsEnabled = Boolean(gaMeasurementId)

export const isPostHogEnabled = Boolean(posthogKey)

export const isAnalyticsEnabled = isGoogleAnalyticsEnabled || isPostHogEnabled
