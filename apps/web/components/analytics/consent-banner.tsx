"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useConsent } from "@/hooks/use-consent"

/**
 * Banner persetujuan analytics.
 *
 * Dua hal yang dijaga di sini:
 * 1. **Nol CLS.** Banner memakai `fixed` sehingga berada di luar alur layout —
 *    kemunculannya tidak pernah menggeser konten halaman.
 * 2. **Tidak berkedip.** Tidak dirender sama sekali sampai localStorage terbaca
 *    (`isReady`), jadi pengunjung yang sudah memilih tidak melihat banner
 *    muncul sekejap lalu hilang.
 */
export function ConsentBanner() {
  const { consent, isReady, grant, deny } = useConsent()

  if (!isReady || consent !== "unknown") return null

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Persetujuan analitik"
      className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4"
    >
      <div className="card bg-panel border-line shadow-lift mx-auto flex max-w-3xl flex-col gap-3 rounded-lg border-2 p-4 sm:flex-row sm:items-center sm:gap-4">
        <p className="text-ink flex-1 text-sm leading-relaxed">
          Kami memakai analitik untuk melihat halaman mana yang berguna. Tanpa
          izinmu, tidak ada yang kami kumpulkan.{" "}
          <Link href="/legal/privacy" className="underline underline-offset-2">
            Kebijakan Privasi
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="ghost" size="sm" onClick={deny}>
            Tolak
          </Button>
          <Button variant="primary" size="sm" onClick={grant}>
            Izinkan
          </Button>
        </div>
      </div>
    </div>
  )
}
