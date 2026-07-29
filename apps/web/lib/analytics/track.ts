import type { AnalyticsEventMap, AnalyticsEventName } from "./events"

/**
 * Satu pintu keluar untuk semua event analytics.
 *
 * GA4 dijangkau lewat `window.gtag` (dipasang oleh komponen GoogleAnalytics).
 * PostHog TIDAK diimpor di sini secara sengaja: kalau diimpor, setiap halaman
 * yang memanggil `track()` akan menarik bundel posthog-js walau consent belum
 * diberikan. Jadi PostHogProvider yang MENDAFTARKAN fungsi capture-nya ke sini
 * setelah inisialisasi.
 */

type CaptureFn = (name: string, properties?: Record<string, unknown>) => void

let capture: CaptureFn | null = null

/** Dipanggil PostHogProvider setelah init; `null` saat provider dilepas. */
export function registerAnalyticsCapture(fn: CaptureFn | null): void {
	capture = fn
}

/**
 * Mengirim satu event produk. Aman dipanggil kapan pun: bila analytics mati
 * atau consent belum diberikan, ini tidak melakukan apa-apa (bukan error).
 */
export function track<TName extends AnalyticsEventName>(
	name: TName,
	properties: AnalyticsEventMap[TName],
): void {
	if (typeof window === "undefined") return
	const payload = { ...properties } as Record<string, unknown>
	window.gtag?.("event", name, payload)
	capture?.(name, payload)
}

type WebVitalMetric = {
	name: string
	value: number
	id: string
	rating?: string
}

/**
 * Mengirim metrik Core Web Vitals.
 *
 * GA4 hanya menyimpan bilangan bulat, sedangkan CLS bernilai desimal kecil
 * (mis. 0,043). Karena itu CLS dikalikan 1000 sebelum dibulatkan — nilai di
 * laporan harus dibagi 1000 lagi saat dibaca.
 */
export function trackWebVital(metric: WebVitalMetric): void {
	if (typeof window === "undefined") return
	const value =
		metric.name === "CLS" ? Math.round(metric.value * 1000) : Math.round(metric.value)

	const payload: Record<string, unknown> = {
		metric_name: metric.name,
		metric_value: value,
		metric_id: metric.id,
		metric_rating: metric.rating,
		non_interaction: true,
	}

	window.gtag?.("event", "web_vitals", payload)
	capture?.("web_vitals", payload)
}
