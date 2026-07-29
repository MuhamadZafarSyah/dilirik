/**
 * Penyimpanan dan penyiaran keputusan consent analytics.
 *
 * Dasar hukum: UU PDP No. 27/2022 mensyaratkan persetujuan sebelum pemrosesan
 * data pribadi. Karena itu defaultnya DITOLAK, bukan diizinkan.
 *
 * Berkas ini sengaja tidak mengandung React — hanya penyimpanan + event — agar
 * bisa dipakai dari mana saja dan diuji tanpa merender komponen.
 */

export const CONSENT_STORAGE_KEY = "dilirik.analytics-consent.v1"

/** Event internal agar semua komponen di tab yang sama ikut ter-update. */
export const CONSENT_CHANGE_EVENT = "dilirik:analytics-consent-change"

export type ConsentDecision = "granted" | "denied"

/** `unknown` = pengguna belum memilih; inilah kondisi yang memunculkan banner. */
export type ConsentState = ConsentDecision | "unknown"

function isDecision(value: string | null): value is ConsentDecision {
	return value === "granted" || value === "denied"
}

/**
 * Membaca keputusan tersimpan. Selalu `unknown` di server agar hasil render
 * server dan klien sama (tidak ada hydration mismatch).
 */
export function readConsent(): ConsentState {
	if (typeof window === "undefined") return "unknown"
	try {
		const stored = window.localStorage.getItem(CONSENT_STORAGE_KEY)
		return isDecision(stored) ? stored : "unknown"
	} catch {
		// localStorage bisa dilarang (mode privat, cookie diblokir total).
		// Anggap belum memilih daripada melempar error.
		return "unknown"
	}
}

/**
 * Meneruskan keputusan ke Google Consent Mode v2.
 * `ad_*` selalu `denied`: Dilirik tidak memakai iklan, jadi tidak ada alasan
 * meminta izin yang tidak dipakai.
 */
export function updateGoogleConsent(decision: ConsentDecision): void {
	if (typeof window === "undefined" || typeof window.gtag !== "function") return
	window.gtag("consent", "update", {
		analytics_storage: decision,
		ad_storage: "denied",
		ad_user_data: "denied",
		ad_personalization: "denied",
	})
}

/** Menyimpan keputusan, memberi tahu Google, lalu menyiarkan ke komponen lain. */
export function writeConsent(decision: ConsentDecision): void {
	if (typeof window === "undefined") return
	try {
		window.localStorage.setItem(CONSENT_STORAGE_KEY, decision)
	} catch {
		// Keputusan tetap berlaku untuk sesi ini walau gagal disimpan.
	}
	updateGoogleConsent(decision)
	window.dispatchEvent(
		new CustomEvent<ConsentDecision>(CONSENT_CHANGE_EVENT, { detail: decision }),
	)
}

/**
 * Berlangganan perubahan consent.
 * Mendengarkan dua sumber: event internal (perubahan di tab ini) dan event
 * `storage` bawaan browser (perubahan dari tab lain).
 */
export function subscribeConsent(
	listener: (state: ConsentState) => void,
): () => void {
	if (typeof window === "undefined") return () => {}

	const handleInternal = (event: Event) => {
		const detail = (event as CustomEvent<ConsentDecision>).detail
		listener(isDecision(detail) ? detail : readConsent())
	}

	const handleStorage = (event: StorageEvent) => {
		if (event.key !== CONSENT_STORAGE_KEY) return
		listener(readConsent())
	}

	window.addEventListener(CONSENT_CHANGE_EVENT, handleInternal)
	window.addEventListener("storage", handleStorage)

	return () => {
		window.removeEventListener(CONSENT_CHANGE_EVENT, handleInternal)
		window.removeEventListener("storage", handleStorage)
	}
}
