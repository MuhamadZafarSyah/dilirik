import Link from "next/link"

/** Landing page (PRD §10 & §11 Flow A) — gaya scrapbook, CTA jelas. */
export default function LandingPage() {
  return (
    <main className="paper-texture min-h-screen">
      {/* Header */}
      <header className="shell mx-auto flex max-w-shell items-center justify-between px-4 py-5">
        <span className="hand text-3xl">Dilirik <span aria-hidden>👀</span></span>
        <nav className="flex items-center gap-3">
          <Link href="/pricing" className="label text-sm font-semibold hover:underline">Pricing</Link>
          <Link href="/login" className="label text-sm font-semibold hover:underline">Masuk</Link>
          <Link href="/register" className="label bg-ink text-paper rounded-md px-4 py-2 text-sm font-bold transition-transform hover:rotate-[-2deg]">
            Daftar gratis
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="shell mx-auto max-w-shell px-4 py-16 text-center md:py-24">
        <div className="relative mx-auto max-w-2xl">
          <span className="tape" aria-hidden />
          <h1 className="hand text-5xl leading-tight md:text-7xl">
            Bikin CV-mu <span className="text-red underline decoration-wavy">dilirik</span>.
          </h1>
          <p className="text-muted mx-auto mt-6 max-w-xl text-lg">
            Tempel CV + lowongan incaranmu. Dapatkan skor kecocokan, gap yang jujur,
            dan saran perbaikan — <strong className="text-ink">tanpa mengarang pengalaman</strong>.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link href="/register" className="label bg-red text-paper rounded-md px-6 py-3 font-bold shadow-lift transition-transform hover:rotate-[-2deg]">
              Coba gratis — 10 analisis/bulan
            </Link>
            <Link href="/pricing" className="scrawl text-xl underline">lihat pricing →</Link>
          </div>
        </div>
      </section>

      {/* 3 langkah */}
      <section className="shell mx-auto max-w-shell px-4 pb-20">
        <h2 className="scrawl mb-8 text-center text-3xl">Cara kerjanya (3 langkah doang)</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { n: "1", t: "Tempel CV-mu", d: "Upload PDF/DOCX atau paste teks. Bahasa apa pun — output ngikutin bahasa CV-mu." },
            { n: "2", t: "Tempel lowongannya", d: "Copy-paste job posting dari mana saja. Kami ekstrak skill wajib & nice-to-have." },
            { n: "3", t: "Lihat skor & perbaiki", d: "Skor 0–100, gap beneran vs gap penyajian, dan saran yang bisa langsung diterapkan." },
          ].map((step, i) => (
            <div key={step.n} className={`card bg-panel border-line relative rounded-lg border-2 p-6 shadow-paper ${i % 2 ? "rotate-[1deg]" : "rotate-[-1deg]"}`}>
              <span className={i === 0 ? "tape" : i === 1 ? "tape-blue" : "tape-red"} aria-hidden />
              <div className="hand text-red text-4xl">{step.n}.</div>
              <h3 className="label mt-2 font-bold">{step.t}</h3>
              <p className="text-muted mt-2 text-sm">{step.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Janji kejujuran */}
      <section className="shell mx-auto max-w-shell px-4 pb-20">
        <div className="sticky-note bg-yellow/30 border-yellow mx-auto max-w-xl rotate-[-1deg] rounded-sm border-l-4 p-6 text-center">
          <p className="hand text-2xl">“Kami nggak akan pernah nyuruh kamu bohong di CV.”</p>
          <p className="text-muted mt-2 text-sm">
            Setiap saran dicek ulang terhadap fakta di CV-mu. Saran yang mengada-ada otomatis dibuang.
          </p>
        </div>
      </section>

      <footer className="border-line border-t-2 py-8 text-center">
        <p className="label text-muted text-xs">
          © {new Date().getFullYear()} Dilirik · <Link href="/legal/privacy" className="underline">Privasi</Link> · <Link href="/legal/terms" className="underline">Ketentuan</Link>
        </p>
      </footer>
    </main>
  )
}
