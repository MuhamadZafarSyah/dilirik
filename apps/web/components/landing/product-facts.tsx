import Link from "next/link"

/**
 * Fakta produk, bukan klaim performa.
 *
 * Angka lama seperti "3,5 kali lebih mungkin dipanggil HR" dihapus karena tidak
 * ada datanya. Yang tersisa hanya hal yang bisa diverifikasi langsung di dalam
 * aplikasi.
 */
const facts = [
  { value: "10", label: "analisis gratis tiap bulan selama beta" },
  { value: "Rp0", label: "biaya, dan tanpa kartu kredit" },
  { value: "PDF, DOCX, teks", label: "format unggah dan ekspor" },
  { value: "Bahasa Indonesia", label: "bahasa analisis dan antarmuka" },
]

export function ProductFacts() {
  return (
    <section id="harga" className="shell mx-auto max-w-shell scroll-mt-20 border-t border-line py-20">
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {facts.map((fact) => (
          <div key={fact.label} className="space-y-2">
            <p className="hand text-3xl leading-none text-ink">{fact.value}</p>
            <p className="text-sm leading-relaxed text-muted">{fact.label}</p>
          </div>
        ))}
      </div>

      <p className="mt-10 text-sm text-muted">
        Rincian kuota tiap fitur ada di{" "}
        <Link
          href="/pricing"
          className="text-ink underline decoration-line decoration-2 underline-offset-4 transition-colors hover:decoration-ink"
        >
          halaman harga
        </Link>
        .
      </p>
    </section>
  )
}
