import Link from "next/link"

import { Button } from "@/components/ui/button"

/**
 * Penutup. Label tombolnya sengaja sama dengan tombol di header dan hero:
 * satu maksud, satu kalimat, supaya tidak terasa seperti tiga tawaran berbeda.
 */
export function FinalCta() {
  return (
    <section className="shell mx-auto max-w-shell border-t border-line py-24">
      <div className="max-w-2xl space-y-6">
        <h2 className="hand text-4xl leading-tight text-ink sm:text-5xl">
          Cek satu lowongan sekarang
        </h2>
        <p className="text-base leading-relaxed text-muted">
          Sepuluh analisis gratis bulan ini. Tanpa kartu kredit.
        </p>
        <Link href="/register" className="inline-block">
          <Button variant="primary" size="lg">
            Coba gratis
          </Button>
        </Link>
      </div>
    </section>
  )
}
