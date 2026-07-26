"use client"

import { useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { FiCheck, FiCheckCircle, FiCopy, FiZap } from "react-icons/fi"
import { Button } from "@/components/ui/button"
import { Card, Sticky } from "@/components/ui/card"
import { ScoreGauge } from "@/components/ui/gauge"

const DEMO_SAMPLES = [
  {
    id: "frontend",
    role: "Senior Frontend Engineer",
    company: "GoTo Financial",
    cvName: "CV_Budi_Frontend_2026.docx",
    score: 88,
    matchSkills: ["Next.js", "TypeScript", "Tailwind CSS", "React 19", "Zustand"],
    realGap: "Pengalaman GraphQL & Micro-frontend belum terdaftar di lowongan ini.",
    presentationGap: "Optimasi Web Vitals (LCP < 1.2s) sudah dilakukan, tapi tertimbun di hal 2.",
    beforeText: "Meningkatkan kecepatan loading halaman aplikasi web frontend.",
    afterText:
      "Meningkatkan kecepatan loading aplikasi web frontend dengan optimasi Core Web Vitals (LCP < 1.2s dan FID < 50ms) menggunakan Next.js SSR.",
    suggestion: "Pindahkan metrik Web Vitals ke bagian teratas Profil Ringkasan.",
  },
  {
    id: "pm",
    role: "Product Manager",
    company: "Tokopedia",
    cvName: "CV_Siti_ProductManager.pdf",
    score: 76,
    matchSkills: ["Product Roadmap", "User Research", "A/B Testing", "Agile Scrum"],
    realGap: "Pengalaman mengelola budget marketing belum ada di CV.",
    presentationGap: "Metrik peningkatan Conversion Rate +24% belum dicantumkan secara kuantitatif.",
    beforeText: "Memimpin proyek A/B testing untuk meningkatkan konversi pengguna.",
    afterText:
      "Memimpin proyek A/B testing checkout flow yang meningkatkan Conversion Rate sebesar 24% dalam 3 bulan berturut-turut.",
    suggestion: "Tambahkan metrik kuantitatif 24% pada ringkasan A/B testing.",
  },
  {
    id: "backend",
    role: "Backend Developer",
    company: "Traveloka",
    cvName: "CV_Rian_Backend.docx",
    score: 92,
    matchSkills: ["Node.js", "PostgreSQL", "Redis", "Docker", "REST API", "Prisma"],
    realGap: "Sertifikasi AWS Cloud Developer tidak diwajibkan namun jadi nilai plus.",
    presentationGap: "Arsitektur Redis Caching belum dijelaskan dampak spesifik latensinya.",
    beforeText: "Mengimplementasikan Redis Caching pada API pencarian penerbangan.",
    afterText:
      "Mengimplementasikan Redis Caching layer pada query pencarian penerbangan, menurunkan p99 API latency dari 450ms ke 60ms.",
    suggestion: "Sebutkan penurunan p99 API latency dari 450ms menjadi 60ms.",
  },
  {
    id: "data",
    role: "Data Analyst",
    company: "Bukalapak",
    cvName: "CV_Dewi_DataAnalyst.pdf",
    score: 84,
    matchSkills: ["Python", "SQL", "Tableau", "Statistical Analysis", "BigQuery"],
    realGap: "Pengalaman Apache Spark belum tertera di riwayat proyek.",
    presentationGap: "Visualisasi Executive Dashboard belum ditandai sebagai pencapaian utama.",
    beforeText: "Membuat dashboard laporan penjualan rutin untuk tim manajemen.",
    afterText:
      "Merancang Executive Dashboard otomatisasi Tableau & BigQuery yang menghemat 15 jam waktu pelaporan mingguan direksi.",
    suggestion: "Highlight penghematan 15 jam kerja rutin per minggu.",
  },
]

export function LandingDemo() {
  const [activeDemo, setActiveDemo] = useState(0)
  const [activeTab, setActiveTab] = useState<"match" | "gaps" | "revision">("match")
  const [copied, setCopied] = useState(false)

  const sample = DEMO_SAMPLES[activeDemo]!

  const copyText = (txt: string) => {
    navigator.clipboard.writeText(txt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section id="demo" className="scroll-mt-24 border-t-2 border-line">
      <div className="shell py-20 md:py-24">
        <div className="mb-10 space-y-3 text-center">
          <span className="label rounded-full border border-blue/40 bg-blue/20 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-blue">
            Demo Interaktif — Tanpa Perlu Login
          </span>
          <h2 className="hand text-4xl font-bold sm:text-6xl">Rasakan Dilirik membedah CV secara live ⚡</h2>
          <p className="scrawl mx-auto max-w-xl text-xl text-muted">
            pilih role di bawah, lalu jelajahi tiga tahap analisisnya — persis seperti di aplikasi aslinya.
          </p>
        </div>

        <div className="mb-8 flex flex-wrap justify-center gap-2">
          {DEMO_SAMPLES.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setActiveDemo(idx)}
              className={`label cursor-pointer select-none rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                activeDemo === idx
                  ? "-rotate-1 scale-105 bg-ink text-paper shadow-paper"
                  : "border-2 border-line bg-panel text-ink hover:border-ink"
              }`}
            >
              {s.role} @ {s.company}
            </button>
          ))}
        </div>

        <Card tape="red" pin className="mx-auto max-w-4xl overflow-hidden border-2 border-line p-0 shadow-lift">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-line bg-panel p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-red" />
              <span className="h-3 w-3 rounded-full bg-yellow" />
              <span className="h-3 w-3 rounded-full bg-green" />
              <span className="label ml-2 max-w-[200px] truncate text-xs font-bold uppercase text-ink sm:max-w-none">
                Sesi Match: {sample.role} vs {sample.company}
              </span>
            </div>

            <div className="flex items-center gap-1 rounded-lg border border-line bg-paper/80 p-1 text-xs">
              <button
                onClick={() => setActiveTab("match")}
                className={`label rounded px-3 py-1 text-xs font-bold ${
                  activeTab === "match" ? "bg-ink text-paper" : "text-muted hover:text-ink"
                }`}
              >
                1. Match Score
              </button>
              <button
                onClick={() => setActiveTab("gaps")}
                className={`label rounded px-3 py-1 text-xs font-bold ${
                  activeTab === "gaps" ? "bg-ink text-paper" : "text-muted hover:text-ink"
                }`}
              >
                2. Gap Jujur
              </button>
              <button
                onClick={() => setActiveTab("revision")}
                className={`label rounded px-3 py-1 text-xs font-bold ${
                  activeTab === "revision" ? "bg-ink text-paper" : "text-muted hover:text-ink"
                }`}
              >
                3. Revisi Teks
              </button>
            </div>
          </div>

          <div className="min-h-[380px] bg-panel/40 p-6 sm:p-8">
            <AnimatePresence mode="wait">
              {activeTab === "match" && (
                <motion.div
                  key="tab-match"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
                    <ScoreGauge score={sample.score} size={160} />
                    <div className="flex-1 space-y-2 text-center md:text-left">
                      <span className="label rounded-full bg-ink px-3 py-1 text-xs font-bold uppercase text-paper">
                        Kualifikasi Match
                      </span>
                      <h3 className="hand text-3xl font-bold text-ink">{sample.cvName}</h3>
                      <p className="text-xs leading-relaxed text-muted">
                        Sistem mendeteksi <strong className="text-green">5 Skill Wajib Cocok</strong>,{" "}
                        <strong className="text-red">1 Real Gap</strong>, dan{" "}
                        <strong className="text-yellow">1 Presentation Gap</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-line/60 pt-4">
                    <h4 className="label mb-2 flex items-center gap-1 text-xs font-bold uppercase text-green">
                      <FiCheckCircle className="h-4 w-4" /> Skill Wajib Yang Cocok
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {sample.matchSkills.map((sk) => (
                        <span
                          key={sk}
                          className="label rounded-md border border-green/40 bg-green/15 px-3 py-1 text-xs font-bold text-green"
                        >
                          ✓ {sk}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "gaps" && (
                <motion.div
                  key="tab-gaps"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="grid gap-4 md:grid-cols-2"
                >
                  <Sticky tone="red" rotate={-0.8} className="space-y-2 p-5">
                    <span className="label rounded bg-red/20 px-2.5 py-0.5 text-[11px] font-bold uppercase text-red">
                      Gap Beneran (Real Gap)
                    </span>
                    <p className="text-xs font-semibold leading-relaxed text-ink">{sample.realGap}</p>
                    <p className="border-t border-red/30 pt-2 text-xs text-muted">
                      💡 <strong>Saran Jujur Dilirik:</strong> Jangan palsukan skill ini di CV. Pelajari
                      dasar-dasarnya atau sebutkan pengalaman terdekat di wawancara.
                    </p>
                  </Sticky>

                  <Sticky tone="yellow" rotate={0.8} className="space-y-2 p-5">
                    <span className="label rounded bg-yellow/40 px-2.5 py-0.5 text-[11px] font-bold uppercase text-ink">
                      Gap Penyajian (Presentation Gap)
                    </span>
                    <p className="text-xs font-semibold leading-relaxed text-ink">{sample.presentationGap}</p>
                    <p className="border-t border-yellow/40 pt-2 text-xs text-muted">
                      💡 <strong>Saran Menampilkan:</strong> Kamu sudah memiliki pengalamannya, tinggal
                      dipindahkan ke bagian atas CV agar langsung dibaca HR.
                    </p>
                  </Sticky>
                </motion.div>
              )}

              {activeTab === "revision" && (
                <motion.div
                  key="tab-revision"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="label rounded-full bg-ink px-3 py-1 text-xs font-bold uppercase text-paper">
                      Saran Revisi 1-Click (Guardrail Checked)
                    </span>
                    <button
                      onClick={() => copyText(sample.afterText)}
                      className="label flex items-center gap-1 text-xs font-bold text-muted hover:text-ink"
                    >
                      {copied ? <FiCheck className="text-green" /> : <FiCopy />}
                      {copied ? "Tersalin!" : "Salin Teks Revisi"}
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <span className="label text-xs font-bold uppercase text-red">Teks Asli CV Sebelum Revisi:</span>
                      <p className="rounded-lg border border-red/30 bg-red/10 p-3 font-mono text-xs text-muted line-through">
                        {sample.beforeText}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="label text-xs font-bold uppercase text-green">
                        Teks Hasil Revisi Dilirik (100% Fakta):
                      </span>
                      <p className="rounded-lg border border-green/40 bg-green/10 p-3 font-mono text-xs font-bold text-ink">
                        {sample.afterText}
                      </p>
                    </div>

                    <p className="scrawl text-xl text-blue">✍️ catatan AI: {sample.suggestion}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="border-t-2 border-line bg-panel p-4 text-center">
            <Link href="/register">
              <Button variant="danger" size="lg" icon={<FiZap />}>
                Analisis & Revisi CV Kamu Sekarang Gratis →
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </section>
  )
}
