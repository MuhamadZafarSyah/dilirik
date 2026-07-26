"use client"

import Link from "next/link"
import { FiZap } from "react-icons/fi"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

const FOOTER_COLS = [
  {
    title: "Produk",
    links: [
      { label: "Demo Interaktif", href: "#demo" },
      { label: "Fitur", href: "#fitur" },
      { label: "Cara Kerja", href: "#cara-kerja" },
      { label: "Harga", href: "/pricing" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Kebijakan Privasi", href: "/legal/privacy" },
      { label: "Ketentuan Layanan", href: "/legal/terms" },
    ],
  },
  {
    title: "Mulai",
    links: [
      { label: "Masuk", href: "/login" },
      { label: "Daftar Gratis", href: "/register" },
    ],
  },
]

export function LandingFooter() {
  return (
    <>
      {/* ===== CTA akhir ===== */}
      <section className="shell py-20 md:py-24">
        <Card tape="red" pin rotate={-1} className="mx-auto max-w-3xl space-y-6 p-8 text-center sm:p-12">
          <div className="space-y-3">
            <span className="label rounded-full border border-yellow/60 bg-yellow/40 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-ink">
              Mulai Dalam 15 Detik
            </span>
            <h2 className="hand text-4xl font-bold text-ink sm:text-6xl">
              Siap bikin CV-mu dilirik HR hari ini? ⚡
            </h2>
            <p className="scrawl mx-auto max-w-lg text-xl text-muted">
              klaim 10 analisis match gratismu bulan ini — tanpa kartu kredit, tanpa syarat aneh-aneh.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <Link href="/register">
              <Button variant="danger" size="lg" icon={<FiZap />} tape="red" className="px-10">
                Daftar Gratis Sekarang →
              </Button>
            </Link>
          </div>
        </Card>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t-2 border-line bg-panel/80 pt-12 backdrop-blur-xs">
        <div className="shell grid gap-10 pb-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 -rotate-3 items-center justify-center rounded-xl bg-ink text-lg text-paper shadow-paper">
                👀
              </span>
              <span className="hand text-3xl font-bold text-ink">
                Dilirik<span className="text-red">.</span>
              </span>
            </div>
            <p className="scrawl text-2xl text-muted">Bikin CV-mu dilirik.</p>
            <p className="max-w-xs text-xs leading-relaxed text-muted">
              AI matcher CV dengan guardrail kejujuran, revisi DOCX native, live mock interview, dan kanban
              tracker lamaran — dalam satu aplikasi.
            </p>
          </div>

          {FOOTER_COLS.map((col) => (
            <div key={col.title} className="space-y-3">
              <p className="label text-xs font-bold uppercase tracking-wider text-ink">{col.title}</p>
              <ul className="space-y-2">
                {col.links.map((link) =>
                  link.href.startsWith("#") ? (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        className="text-xs font-medium text-muted transition-colors hover:text-ink"
                      >
                        {link.label}
                      </a>
                    </li>
                  ) : (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-xs font-medium text-muted transition-colors hover:text-ink"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ),
                )}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-line/60 py-5">
          <div className="shell flex flex-col items-center justify-between gap-2 text-xs text-muted sm:flex-row">
            <p>© {new Date().getFullYear()} Dilirik. All rights reserved.</p>
            <p className="scrawl text-lg">dibuat dengan 🧡 di Indonesia</p>
          </div>
        </div>
      </footer>
    </>
  )
}
