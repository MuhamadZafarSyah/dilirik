"use client"

import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"

const STEPS = [
  {
    number: "1",
    emoji: "📄",
    accent: "border-red/40 bg-red/15 text-red",
    title: "Upload CV kamu",
    desc: "Drag & drop file PDF atau DOCX — atau tempel teks mentah. Semua versi CV tersimpan rapi.",
  },
  {
    number: "2",
    emoji: "🎯",
    accent: "border-blue/40 bg-blue/15 text-blue",
    title: "Tempel lowongan incaran",
    desc: "AI mengekstrak skill wajib, tanggung jawab, dan kata kunci penting dari job posting.",
  },
  {
    number: "3",
    emoji: "🤖",
    accent: "border-yellow/60 bg-yellow/30 text-ink",
    title: "Terima skor + revisi jujur",
    desc: "Skor match 0–100, pemisahan gap beneran vs gap penyajian, plus saran revisi 1-klik yang 100% fakta.",
  },
  {
    number: "4",
    emoji: "📌",
    accent: "border-green/40 bg-green/15 text-green",
    title: "Ekspor & lacak lamaran",
    desc: "Unduh PDF/DOCX dengan desain asli tetap utuh, lalu pantau progresnya di kanban tracker.",
  },
]

const STATS = [
  {
    value: "3.5×",
    color: "text-red",
    label: "Peluang dipanggil HR",
    desc: "dibanding menyebar CV generik tanpa optimasi keyword",
  },
  {
    value: "100%",
    color: "text-ink",
    label: "Fakta terverifikasi",
    desc: "guardrail 3-titik memblokir saran yang mengarang pengalaman",
  },
  {
    value: "< 15s",
    color: "text-blue",
    label: "Waktu analisis match",
    desc: "dari upload sampai skor & saran revisi keluar",
  },
  {
    value: "10",
    color: "text-green",
    label: "Analisis gratis / bulan",
    desc: "selama masa beta, untuk semua kandidat",
  },
]

export function LandingHow() {
  return (
    <section id="cara-kerja" className="scroll-mt-24 border-t-2 border-line">
      <div className="shell py-20 md:py-24">
        <div className="mb-14 space-y-3 text-center">
          <span className="label rounded-full border border-yellow/60 bg-yellow/40 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-ink">
            Cara Kerja
          </span>
          <h2 className="hand text-4xl font-bold sm:text-6xl">Dari CV mentah ke panggilan interview 🚀</h2>
          <p className="scrawl mx-auto max-w-xl text-xl text-muted">
            empat langkah sederhana — analisis pertamamu selesai kurang dari 15 detik.
          </p>
        </div>

        <div className="grid gap-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ type: "spring", stiffness: 220, damping: 22, delay: i * 0.08 }}
            >
              <Card rotate={i % 2 === 0 ? -0.8 : 0.8} className="relative h-full space-y-3 p-6 pt-9">
                <span
                  className={`hand absolute -top-5 left-5 flex h-10 w-10 items-center justify-center rounded-full border-2 text-2xl font-bold shadow-paper backdrop-blur-xs ${step.accent}`}
                >
                  {step.number}
                </span>
                <div className="text-3xl">{step.emoji}</div>
                <h3 className="hand text-2xl font-bold text-ink">{step.title}</h3>
                <p className="text-xs leading-relaxed text-muted">{step.desc}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        <p className="scrawl mt-10 text-center text-2xl text-blue">
          semuanya gratis 10 sesi tiap bulan — tanpa kartu kredit ✍️
        </p>
      </div>

      <div className="border-t-2 border-line bg-panel/50">
        <div className="shell grid gap-8 py-14 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className={`hand text-6xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="scrawl mt-1 text-2xl font-bold text-ink">{stat.label}</p>
              <p className="mx-auto mt-1 max-w-[220px] text-xs text-muted">{stat.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
