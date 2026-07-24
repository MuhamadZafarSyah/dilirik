import Link from "next/link"

/** Pricing (PRD §14): semua fitur FREE dulu — billing di-defer. */
export default function PricingPage() {
  return (
    <main className="paper-texture min-h-screen">
      <header className="shell mx-auto flex max-w-shell items-center justify-between px-4 py-5">
        <Link href="/" className="hand text-3xl">Dilirik <span aria-hidden>👀</span></Link>
        <Link href="/register" className="label bg-ink text-paper rounded-md px-4 py-2 text-sm font-bold">Daftar gratis</Link>
      </header>

      <section className="shell mx-auto max-w-shell px-4 py-12 text-center">
        <h1 className="hand text-5xl">Pricing</h1>
        <p className="text-muted mt-3">Selama beta: <strong className="text-ink">semuanya gratis.</strong> Serius.</p>

        <div className="mx-auto mt-10 grid max-w-3xl gap-6 md:grid-cols-2">
          <div className="card bg-panel border-line relative rotate-[-1deg] rounded-lg border-2 p-8 shadow-lift">
            <span className="tape" aria-hidden />
            <h2 className="label text-lg font-bold">Free (Beta)</h2>
            <div className="hand text-red mt-2 text-5xl">Rp0</div>
            <ul className="text-ink mt-6 space-y-2 text-left text-sm">
              <li>✓ 10 analisis / bulan</li>
              <li>✓ CV & lowongan tak terbatas</li>
              <li>✓ Semua versi CV tersimpan (bisa di-compare)</li>
              <li>✓ Job application tracker</li>
              <li>✓ Semua bahasa CV didukung</li>
            </ul>
            <Link href="/register" className="label bg-red text-paper mt-8 inline-block rounded-md px-6 py-3 font-bold">
              Mulai sekarang
            </Link>
          </div>
          <div className="card bg-panel border-line relative rotate-[1deg] rounded-lg border-2 border-dashed p-8 opacity-80">
            <span className="tape-blue" aria-hidden />
            <h2 className="label text-lg font-bold">Pro</h2>
            <div className="scrawl text-blue mt-2 text-4xl">segera…</div>
            <ul className="text-muted mt-6 space-y-2 text-left text-sm">
              <li>• Analisis unlimited</li>
              <li>• Model AI terbaik</li>
              <li>• Ekspor laporan</li>
            </ul>
            <p className="text-muted mt-8 text-xs">Pengguna beta akan dapat penawaran spesial 💛</p>
          </div>
        </div>
      </section>
    </main>
  )
}
