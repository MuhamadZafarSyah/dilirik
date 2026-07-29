"use client"

import { useCallback, useEffect, useState } from "react"
import {
	readConsent,
	subscribeConsent,
	writeConsent,
	type ConsentState,
} from "@/lib/analytics/consent"

type UseConsentResult = {
	consent: ConsentState
	/** `false` sampai localStorage terbaca di klien — pakai ini untuk menunda render. */
	isReady: boolean
	grant: () => void
	deny: () => void
}

/**
 * State consent analytics.
 *
 * Nilai awal selalu `unknown` dan baru dibaca di `useEffect` supaya hasil render
 * server sama dengan render pertama di klien (mencegah hydration mismatch).
 */
export function useConsent(): UseConsentResult {
	const [consent, setConsent] = useState<ConsentState>("unknown")
	const [isReady, setIsReady] = useState(false)

	useEffect(() => {
		setConsent(readConsent())
		setIsReady(true)
		return subscribeConsent(setConsent)
	}, [])

	const grant = useCallback(() => writeConsent("granted"), [])
	const deny = useCallback(() => writeConsent("denied"), [])

	return { consent, isReady, grant, deny }
}
