"use client"

import { useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { FiCheck, FiChevronDown, FiStar } from "react-icons/fi"
import { Button } from "@/components/ui/button"
import { Card, Polaroid, Sticky } from "@/components/ui/card"

const FREE_FEATURES = [
  "10 analisis match per bulan",
  "Simpan CV, versi, & lowongan tanpa batas",
  "Revisi .DOCX native + ekspor PDF ATS-friendly",
  "Live mock interview AI",
  "Kanban tracker lamaran drag & drop",
  "Compare CV sebelum vs sesudah",
]

const PRO_FEATURES = [
  "Analisis match unlimited",
  "Model AI paling pintar",
  "Insight per industri & posisi",
  "Dukungan prioritas",
]

const FAQS = [
  {
    q: "Apakah Dilirik benar-benar gratis untuk digunakan?",
    a: "Ya! Selama masa Beta, semua pengguna mendapatkan 10 kali analisis match per bulan secara gratis tanpa perlu kartu kredit. Kamu bisa menyimpan CV, lowongan, dan riwayat analisis tanpa batas.",
  },
  {
    q: "Bagaimana Guardrail Kejujuran Dilirik mencegah AI mengarang fakta?",
    a: "Sistem AI kami menggunakan validasi fakta 3-titik. Sebelum sebuah saran revisi diberikan, AI memverifikasi apakah ada bukti pengalaman di teks asli CV kamu. Jika saran mengada-ada atau berisiko bohong, sistem otomatis membuangnya.",
  },
  {
    q: "Apa itu fitur Live Mock Interview?",
    a: "Simulasi wawancara real-time dengan AI yang menyusun pertanyaan dari CV dan lowongan aslimu. Kamu menjawab lewat teks, AI memberi feedback per jawaban plus skor akhir sebagai bekal persiapan interview beneran.",
  },
  {
    q: "Apakah format CV hasil revisi Dilirik ramah sistem ATS (Applicant Tracking System)?",
    a: "Sangat ramah! Ekspor PDF dari Dilirik menggunakan struktur teks bersih, font standar universal, dan tanpa elemen grafik kompleks yang membingungkan parser ATS. Jika kamu mengunggah file .docx, Dilirik merevisi file .docx asli milikmu secara native tanpa merusak desain, font, dan tabel.",
  },
  {
    q: "Format dokumen apa saja yang bisa di-upload ke Dilirik?",
    a: "Kamu bisa mengupload file PDF, DOCX (Microsoft Word) dengan fitur Drag & Drop instan, atau langsung menempelkan (paste) teks mentah CV milikmu.",
  },
  {
    q: "Apakah data CV dan lowongan yang saya simpan terjamin kerahasiaannya?",
    a: "Tentu saja. Data kamu tersimpan secara terenkripsi di database privat dan tidak akan pernah dijual atau dibagikan kepada pihak ketiga.",
  },
]

export function LandingSocial() {
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  return (
    <>
      {/* ===== Testimoni corkboard ===== */}
      <section id="testimoni" className="scroll-mt-24 border-t-2 border-line">
        <div className="shell py-20 md:py-24">
          <div className="mb-12 space-y-3 text-center">
            <span className="label rounded-full border border-yellow/60 bg-yellow/40 px-3 py-1 text-xs font-bold uppercase tracking-wider text-ink">
              Kisah Sukses Kandidat
            </span>
            <h2 className="hand text-4xl font-bold sm:text-5xl">Apa kata mereka yang sudah dilirik HR 💬</h2>
            <p className="scrawl mx-auto max-w-xl text-xl text-muted">
              testimoni jujur dari para pencari kerja yang berhasil lolos ke tahap interview.
            </p>
          </div>

          <div className="corkboard rounded-2xl border-4 p-6 shadow-lift sm:p-10">
            <div className="grid gap-6 md:grid-cols-3">
              <Polaroid tape="yellow" pin rotate={-2} className="flex h-full flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-1 text-yellow">
                    {[...Array(5)].map((_, i) => (
                      <FiStar key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-xs italic leading-relaxed text-ink sm:text-sm">
                    "Baru sadar ternyata pencapaian optimasi query PostgreSQL saya tertimbun di paragraf bawah.
                    Setelah ditonjolkan lewat saran Dilirik, besoknya langsung dipanggil interview!"
                  </p>
                </div>
                <div className="mt-4 border-t border-line/60 pt-4">
                  <p className="hand text-xl font-bold text-ink">Budi Pratama</p>
                  <p className="label text-[11px] uppercase text-muted">Backend Dev @ Startup Fintech</p>
                </div>
              </Polaroid>

              <Sticky tone="yellow" rotate={1} className="flex h-full flex-col justify-between p-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-1 text-ink">
                    {[...Array(5)].map((_, i) => (
                      <FiStar key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-xs font-medium leading-relaxed text-ink sm:text-sm">
                    "Yang paling saya suka itu Guardrail Kejujurannya. Dulu pakai ChatGPT malah disuruh nulis
                    pengalaman AWS yang belum pernah saya pegang. Di Dilirik 100% fakta asli saya!"
                  </p>
                </div>
                <div className="mt-4 border-t border-yellow/60 pt-4">
                  <p className="hand text-xl font-bold text-ink">Siti Rahmawati</p>
                  <p className="label text-[11px] uppercase text-muted">UI/UX Designer @ E-commerce</p>
                </div>
              </Sticky>

              <Polaroid tape="red" pin rotate={-1} className="flex h-full flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-1 text-red">
                    {[...Array(5)].map((_, i) => (
                      <FiStar key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-xs italic leading-relaxed text-ink sm:text-sm">
                    "Skor Match nya presisi banget. Begitu dapet skor 88/100 langsung pede ngelamar dan beneran
                    dipanggil 3 HR sekaligus dalam seminggu."
                  </p>
                </div>
                <div className="mt-4 border-t border-line/60 pt-4">
                  <p className="hand text-xl font-bold text-ink">Rian Kurnia</p>
                  <p className="label text-[11px] uppercase text-muted">Frontend Engineer @ GoTo</p>
                </div>
              </Polaroid>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Pricing ===== */}
      <section id="harga" className="scroll-mt-24 border-t-2 border-line">
        <div className="shell py-20 md:py-24">
          <div className="mb-12 space-y-3 text-center">
            <span className="label rounded-full border border-green/40 bg-green/20 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-green">
              Harga
            </span>
            <h2 className="hand text-4xl font-bold sm:text-6xl">Harga paling jujur: gratis 💸</h2>
            <p className="scrawl mx-auto max-w-xl text-xl text-muted">
              selama masa beta, semua fitur inti bisa kamu pakai tanpa bayar sepeser pun.
            </p>
          </div>

          <div className="mx-auto grid max-w-3xl items-stretch gap-8 md:grid-cols-2">
            <Card tape="yellow" pin rotate={-1} className="flex h-full flex-col p-8">
              <span className="label self-start rounded-full border border-green/40 bg-green/20 px-3 py-1 text-xs font-bold uppercase text-green">
                Beta — Untuk Semua
              </span>
              <p className="hand mt-4 text-6xl font-bold text-ink">
                Rp 0<span className="scrawl text-2xl text-muted"> / bulan</span>
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                {FREE_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <FiCheck className="mt-0.5 h-4 w-4 shrink-0 text-green" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-8">
                <Link href="/register" className="block">
                  <Button variant="danger" size="lg" className="w-full">
                    Klaim Gratis Sekarang
                  </Button>
                </Link>
                <p className="scrawl mt-3 text-center text-xl text-muted">tanpa kartu kredit ✌️</p>
              </div>
            </Card>

            <div className="flex h-full flex-col rounded-[14px] border-2 border-dashed border-line bg-panel/40 p-8">
              <span className="label self-start rounded-full border border-line bg-paper px-3 py-1 text-xs font-bold uppercase text-muted">
                Pro — Segera Hadir 🔒
              </span>
              <p className="hand mt-4 text-6xl font-bold text-muted">Rp ???</p>
              <ul className="mt-6 space-y-3 text-sm text-muted">
                {PRO_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span className="shrink-0">✦</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-8">
                <span className="label block rounded-full border-2 border-line bg-paper px-4 py-3 text-center text-sm font-bold uppercase text-muted">
                  Nantikan ya ✨
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" className="scroll-mt-24 border-t-2 border-line">
        <div className="shell py-20 md:py-24">
          <div className="mb-12 space-y-3 text-center">
            <h2 className="hand text-4xl font-bold sm:text-5xl">Pertanyaan sering diajukan ❓</h2>
            <p className="scrawl mx-auto max-w-xl text-xl text-muted">
              semua hal yang perlu kamu ketahui tentang Dilirik.
            </p>
          </div>

          <div className="mx-auto max-w-3xl space-y-4">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx
              return (
                <Card key={idx} rotate={idx % 2 === 0 ? 0.4 : -0.4} className="overflow-hidden p-0">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="flex w-full cursor-pointer items-center justify-between gap-4 p-5 text-left font-bold transition-colors hover:bg-paper/50"
                  >
                    <span className="hand text-2xl text-ink">{faq.q}</span>
                    <FiChevronDown
                      className={`h-5 w-5 shrink-0 transition-transform ${
                        isOpen ? "rotate-180 text-red" : "text-muted"
                      }`}
                    />
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                      >
                        <div className="border-t border-line/60 p-5 text-xs leading-relaxed text-muted sm:text-sm">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              )
            })}
          </div>
        </div>
      </section>
    </>
  )
}
