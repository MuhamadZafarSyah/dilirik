import Link from "next/link"

import { Button } from "@/components/ui/button"

/*
 * TODO(aset): hero masih tanpa gambar karena belum ada aset final. Yang
 * dibutuhkan: satu foto atau ilustrasi 1200x900 bertema "CV di atas meja",
 * ditaruh di `apps/web/public/hero.png`, lalu dipasang sebagai kolom kanan
 * dengan `next/image` (`priority`, `sizes="(min-width: 1024px) 42vw, 100vw"`).
 * Sengaja tidak diganti ilustrasi SVG buatan sendiri atau tangkapan layar palsu
 * dari susunan div.
 */

/**
 * Hero. Tiga elemen teks saja: judul, satu kalimat penjelas, dan tombol.
 * Semua klaim pendukung dipindahkan ke bagian di bawahnya supaya bagian atas
 * halaman punya satu pesan, bukan daftar fitur.
 */
export function Hero() {
  return (
    <section className="shell mx-auto flex min-h-[68svh] max-w-shell flex-col justify-center py-16 sm:py-24">
      <div className="max-w-3xl space-y-7">
        <h1 className="hand text-5xl leading-[1.05] text-ink sm:text-6xl lg:text-7xl">
          Cocokkan CV-mu dengan lowongan, tanpa mengarang apa pun.
        </h1>

        <p className="max-w-xl text-lg leading-relaxed text-muted">
          Tempel CV dan lowongan incaranmu. Dapat skor kecocokan, gap yang jujur,
          dan saran revisi yang selalu berdasar isi CV kamu.
        </p>

        <div className="flex flex-wrap items-center gap-4">
          <Link href="/register">
            <Button variant="primary" size="lg">
              Coba gratis
            </Button>
          </Link>
          <a
            href="#contoh"
            className="text-sm text-ink underline decoration-line decoration-2 underline-offset-4 transition-colors hover:decoration-ink"
          >
            Lihat contoh hasil analisis
          </a>
        </div>
      </div>
    </section>
  )
}
