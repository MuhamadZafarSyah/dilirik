"use client"

import { useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  FiArrowRight,
  FiCheckCircle,
  FiZap,
  FiFileText,
  FiShield,
  FiStar,
  FiChevronDown,
  FiAward,
  FiLock,
  FiCpu,
  FiLayers,
  FiBriefcase,
  FiCheck,
  FiXCircle,
} from "react-icons/fi"
import { Button } from "@/components/ui/button"
import { Card, Sticky, Polaroid } from "@/components/ui/card"
import { ScoreGauge } from "@/components/ui/gauge"

/* ================= Animation Variants ================= */

const fadeIn = {
  hidden: { opacity: 0, y: 25 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.05 },
  },
}

const popIn = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 280, damping: 22 },
  },
}

/* ================= Interactive Demo Data ================= */

const DEMO_SAMPLES = [
  {
    role: "Senior Frontend Engineer",
    company: "GoTo Financial",
    cvName: "CV_Budi_Frontend_2026.pdf",
    score: 88,
    matchSkills: ["Next.js", "TypeScript", "Tailwind CSS", "React 19", "Zustand"],
    realGap: "Pengalaman GraphQL & Micro-frontend belum terdaftar di lowongan ini.",
    presentationGap: "Optimasi Core Web Vitals (LCP < 1.2s) sudah kamu lakukan, tapi ditulis di halaman 2.",
    suggestion: "Pindahkan angka pencapaian Web Vitals ke bagian teratas Profil Ringkasan.",
  },
  {
    role: "Product Manager",
    company: "Tokopedia",
    cvName: "CV_Siti_ProductManager.pdf",
    score: 76,
    matchSkills: ["Product Roadmap", "User Research", "A/B Testing", "Agile Scrum"],
    realGap: "Pengalaman mengelola budget marketing belum ada di CV.",
    presentationGap: "Metrik peningkatan Conversion Rate +24% belum dicantumkan kuantitatif.",
    suggestion: "Ubah tulisan 'Meningkatkan konversi' menjadi 'Meningkatkan Conversion Rate sebesar 24% dalam 3 bulan'.",
  },
  {
    role: "Backend Developer",
    company: "Traveloka",
    cvName: "CV_Rian_Backend.docx",
    score: 92,
    matchSkills: ["Node.js", "PostgreSQL", "Redis", "Docker", "REST API", "Prisma"],
    realGap: "Sertifikasi AWS Cloud Developer tidak diwajibkan namun jadi nilai plus.",
    presentationGap: "Arsitektur Redis Caching belum dijelaskan dampak latensinya.",
    suggestion: "Tambahkan catatan latensi respon API turun dari 450ms menjadi 60ms menggunakan Redis.",
  },
]

/* ================= FAQ Items ================= */

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
    q: "Apakah format CV hasil revisi Dilirik ramah sistem ATS (Applicant Tracking System)?",
    a: "Sangat ramah! Ekspor PDF dari Dilirik menggunakan struktur teks bersih, font standar universal, dan tanpa elemen grafik kompleks yang sering membingungkan parser ATS.",
  },
  {
    q: "Format dokumen apa saja yang bisa di-upload ke Dilirik?",
    a: "Kamu bisa mengupload file PDF, DOCX (Microsoft Word), atau langsung menempelkan (paste) teks mentah CV milikmu.",
  },
  {
    q: "Apakah data CV dan lowongan yang saya simpan terjamin kerahasiaannya?",
    a: "Tentu saja. Data kamu tersimpan secara terenkripsi di database privat dan tidak akan pernah dijual atau dibagikan kepada pihak ketiga.",
  },
]

export default function LandingPage() {
  const [activeDemo, setActiveDemo] = useState(0)
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  const sample = DEMO_SAMPLES[activeDemo]!

  return (
    <main className="paper-texture min-h-screen overflow-x-hidden text-ink">
      {/* ================= Sticky Navigation Header ================= */}
      <header className="sticky top-0 z-50 border-b-2 border-line bg-panel/85 backdrop-blur-md transition-all">
        <div className="shell mx-auto flex max-w-shell items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-2 group">
            <motion.div
              whileHover={{ rotate: 15, scale: 1.1 }}
              className="bg-ink text-paper flex h-9 w-9 items-center justify-center rounded-xl shadow-paper text-lg font-bold"
            >
              👀
            </motion.div>
            <span className="hand text-3xl font-bold tracking-tight">Dilirik</span>
          </Link>

          {/* Desktop Links */}
          <nav className="hidden md:flex items-center gap-6">
            <a href="#demo" className="label text-xs font-bold uppercase tracking-wider text-muted hover:text-ink transition-colors">
              Demo Interaktif
            </a>
            <a href="#mengapa" className="label text-xs font-bold uppercase tracking-wider text-muted hover:text-ink transition-colors">
              Mengapa Dilirik
            </a>
            <a href="#guardrail" className="label text-xs font-bold uppercase tracking-wider text-muted hover:text-ink transition-colors">
              Guardrail Kejujuran
            </a>
            <a href="#testimoni" className="label text-xs font-bold uppercase tracking-wider text-muted hover:text-ink transition-colors">
              Testimoni
            </a>
            <a href="#faq" className="label text-xs font-bold uppercase tracking-wider text-muted hover:text-ink transition-colors">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login" className="label text-xs font-bold text-ink hover:text-red transition-colors hidden sm:block">
              Masuk
            </Link>
            <Link href="/register">
              <Button variant="danger" size="sm" tape="yellow">
                Coba Gratis ⚡
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ================= HERO SECTION ================= */}
      <section className="shell mx-auto max-w-shell px-5 pt-12 pb-16 md:pt-20 md:pb-24 text-center">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="relative mx-auto max-w-4xl space-y-6"
        >
          {/* Top Badge */}
          <motion.div variants={popIn} className="inline-block">
            <span className="label bg-yellow/40 border-2 border-yellow/80 text-ink px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-paper rotate-[-1deg] inline-flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red" />
              </span>
              AI Matcher CV & Guardrail Kejujuran 100% Fakta
            </span>
          </motion.div>

          {/* Main Display Headline */}
          <motion.h1
            variants={popIn}
            className="hand text-5xl sm:text-7xl lg:text-8xl leading-[1.05] font-bold text-ink"
          >
            Bikin CV-mu <span className="text-red underline decoration-wavy">dilirik HR</span>, tanpa perlu bohong.
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={popIn}
            className="text-muted text-base sm:text-xl max-w-2xl mx-auto leading-relaxed"
          >
            Tempelkan CV + lowongan incaranmu. Dapatkan skor kecocokan real-time, deteksi gap yang jujur, dan saran revisi instan — <strong className="text-ink font-bold">100% berdasarkan fakta asli CV kamu</strong>.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div variants={popIn} className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <Link href="/register">
              <Button variant="danger" size="lg" icon={<FiZap />} tape="red" className="px-8">
                Coba Gratis — 10 Analisis / Bulan
              </Button>
            </Link>
            <a href="#demo">
              <Button variant="outline" size="lg" icon={<FiArrowRight />}>
                Lihat Demo Interaktif ↓
              </Button>
            </a>
          </motion.div>

          {/* Trust Highlights */}
          <motion.div variants={popIn} className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs font-bold text-muted uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <FiCheckCircle className="text-green h-4 w-4" /> 0% Mengarang Pengalaman
            </span>
            <span className="flex items-center gap-1.5">
              <FiCheckCircle className="text-green h-4 w-4" /> Ekspor PDF Ramah ATS
            </span>
            <span className="flex items-center gap-1.5">
              <FiCheckCircle className="text-green h-4 w-4" /> Tanpa Kartu Kredit
            </span>
          </motion.div>
        </motion.div>
      </section>

      {/* ================= DEMO INTERAKTIF SANDBOX ================= */}
      <section id="demo" className="shell mx-auto max-w-shell px-5 py-12 md:py-20 border-t-2 border-line">
        <div className="text-center space-y-3 mb-10">
          <span className="label bg-blue/20 text-blue border border-blue/40 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            Coba Demo Langsung
          </span>
          <h2 className="hand text-4xl sm:text-5xl font-bold">Bagaimana Dilirik Menganalisis Match CV Kamu 🔍</h2>
          <p className="scrawl text-muted text-xl max-w-xl mx-auto">
            Pilih sampel posisi di bawah untuk melihat simulasi analisis skor, gap jujur, dan saran AI secara nyata.
          </p>
        </div>

        {/* Demo Selector Tabs */}
        <div className="flex justify-center flex-wrap gap-2 mb-8">
          {DEMO_SAMPLES.map((s, idx) => (
            <button
              key={s.role}
              onClick={() => setActiveDemo(idx)}
              className={`label rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                activeDemo === idx
                  ? "bg-ink text-paper shadow-paper -rotate-1 scale-105"
                  : "bg-panel border-2 border-line text-ink hover:border-ink"
              }`}
            >
              {s.role} @ {s.company}
            </button>
          ))}
        </div>

        {/* Interactive Demo Card */}
        <motion.div
          key={activeDemo}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="max-w-4xl mx-auto"
        >
          <Card tape="yellow" pin className="p-6 md:p-8 space-y-6">
            {/* Header info */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b-2 border-line pb-6">
              <div className="text-center md:text-left space-y-1">
                <span className="label bg-ink text-paper px-2.5 py-0.5 rounded text-[11px] font-bold uppercase">
                  {sample.cvName}
                </span>
                <h3 className="hand text-3xl font-bold text-ink mt-1">
                  {sample.role} <span className="text-muted font-normal">@ {sample.company}</span>
                </h3>
                <p className="text-muted text-xs">
                  Sistem AI secara otomatis mengekstrak skill wajib dan memisahkan tipe gap.
                </p>
              </div>

              {/* Live Gauge */}
              <ScoreGauge score={sample.score} size={150} />
            </div>

            {/* Content Breakdown */}
            <div className="grid gap-6 md:grid-cols-2 pt-2">
              <div className="space-y-4">
                <div>
                  <h4 className="label text-xs font-bold uppercase tracking-wider text-green mb-2 flex items-center gap-1">
                    <FiCheckCircle className="h-4 w-4" /> Skill Wajib Yang Cocok (Match)
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {sample.matchSkills.map((sk) => (
                      <span key={sk} className="label bg-green/15 border border-green/40 text-green rounded-md px-2.5 py-1 text-xs font-bold">
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>

                <Sticky tone="red" rotate={-0.8} className="space-y-1">
                  <span className="label bg-red/20 text-red px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                    Gap Beneran (Real Gap)
                  </span>
                  <p className="text-xs font-medium leading-relaxed">{sample.realGap}</p>
                </Sticky>
              </div>

              <div className="space-y-4">
                <Sticky tone="yellow" rotate={0.8} className="space-y-1">
                  <span className="label bg-yellow/40 text-ink px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                    Gap Penyajian (Presentation Gap)
                  </span>
                  <p className="text-xs font-medium leading-relaxed">{sample.presentationGap}</p>
                </Sticky>

                <Card rotate={-0.5} className="space-y-2 bg-paper/80">
                  <span className="label bg-blue/20 text-blue border border-blue/40 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                    💡 Saran Revisi AI 1-Click
                  </span>
                  <p className="text-xs font-mono font-bold text-ink leading-relaxed bg-panel p-3 rounded-lg border border-line">
                    "{sample.suggestion}"
                  </p>
                </Card>
              </div>
            </div>

            <div className="pt-4 text-center border-t border-line">
              <Link href="/register">
                <Button variant="danger" size="lg" icon={<FiZap />} className="w-full sm:w-auto">
                  Coba Analisis CV Milikmu Sendiri Sekarang →
                </Button>
              </Link>
            </div>
          </Card>
        </motion.div>
      </section>

      {/* ================= PROBLEM VS SOLUTION ================= */}
      <section id="mengapa" className="shell mx-auto max-w-shell px-5 py-16 border-t-2 border-line">
        <div className="text-center space-y-3 mb-12">
          <h2 className="hand text-4xl sm:text-5xl font-bold">Kenapa 80% CV Bagus Tetap Diabaikan HR? 🤔</h2>
          <p className="scrawl text-muted text-xl max-w-xl mx-auto">
            Masalah utamanya bukan kurang pengalaman, tapi cara menyajikan fakta dan kata kunci yang tidak pas.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
          {/* Old Way */}
          <Card tape="red" rotate={-1} className="space-y-4 p-6 bg-red/5 border-red/40">
            <div className="flex items-center gap-2 text-red font-bold">
              <FiXCircle className="h-6 w-6 shrink-0" />
              <h3 className="hand text-3xl">Cara Lama (Berisiko & Buta)</h3>
            </div>
            <ul className="space-y-3 text-xs sm:text-sm text-ink font-medium leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-red font-bold shrink-0">✕</span>
                <span>Asal sebar CV yang sama ke 50 lowongan tanpa optimasi keyword.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red font-bold shrink-0">✕</span>
                <span>Gunakan AI generik yang sering menyuruh mengarang pengalaman palsu.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red font-bold shrink-0">✕</span>
                <span>Gagal wawancara teknis karena ketahuan bohong di CV.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red font-bold shrink-0">✕</span>
                <span>Tidak tahu kenapa CV selalu tertahan di tahap screening HR.</span>
              </li>
            </ul>
          </Card>

          {/* Dilirik Way */}
          <Card tape="yellow" pin rotate={1} className="space-y-4 p-6 bg-green/5 border-green/40">
            <div className="flex items-center gap-2 text-green font-bold">
              <FiCheckCircle className="h-6 w-6 shrink-0" />
              <h3 className="hand text-3xl">Solusi Dilirik (Smart & Jujur)</h3>
            </div>
            <ul className="space-y-3 text-xs sm:text-sm text-ink font-medium leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-green font-bold shrink-0">✓</span>
                <span>Ekstraksi kata kunci spesifik untuk tiap lowongan incaran.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green font-bold shrink-0">✓</span>
                <span><strong>Guardrail Kejujuran 3-Titik</strong> memastikan 100% fakta asli CV kamu.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green font-bold shrink-0">✓</span>
                <span>Percaya diri saat interview karena semua pengalaman terverifikasi asli.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green font-bold shrink-0">✓</span>
                <span>Skor Match 0–100 dan saran revisi teks instan 1-click.</span>
              </li>
            </ul>
          </Card>
        </div>
      </section>

      {/* ================= GUARDRAIL KEJUJURAN 3-TITIK SHOWCASE ================= */}
      <section id="guardrail" className="shell mx-auto max-w-shell px-5 py-16 border-t-2 border-line">
        <div className="text-center space-y-3 mb-12">
          <span className="label bg-ink text-paper px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            Fitur Unggulan Dilirik
          </span>
          <h2 className="hand text-4xl sm:text-5xl font-bold">Guardrail Kejujuran 3-Titik 🛡️</h2>
          <p className="scrawl text-muted text-xl max-w-xl mx-auto">
            Satu-satunya AI CV Matcher yang menjamin saran revisi 100% jujur tanpa mengarang fakta.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card tape="yellow" rotate={-1} className="p-6 space-y-3">
            <div className="bg-ink text-yellow h-12 w-12 rounded-xl flex items-center justify-center font-bold text-2xl shadow-paper">
              1
            </div>
            <h3 className="hand text-2xl font-bold text-ink">1. Ekstraksi Fakta Asli</h3>
            <p className="text-muted text-xs sm:text-sm leading-relaxed">
              AI membaca dan mengunci seluruh riwayat kerja, proyek, dan pencapaian asli dari dokumen CV-mu sebagai sumber kebenaran (source of truth).
            </p>
          </Card>

          <Card tape="blue" pin rotate={1} className="p-6 space-y-3">
            <div className="bg-ink text-blue h-12 w-12 rounded-xl flex items-center justify-center font-bold text-2xl shadow-paper">
              2
            </div>
            <h3 className="hand text-2xl font-bold text-ink">2. Pemisahan Tipe Gap</h3>
            <p className="text-muted text-xs sm:text-sm leading-relaxed">
              Sistem memisahkan antara <strong>Gap Beneran</strong> (skill yang belum kamu miliki) dengan <strong>Gap Penyajian</strong> (pencapaian asli yang belum kamu tonjolkan).
            </p>
          </Card>

          <Card tape="red" rotate={-1} className="p-6 space-y-3">
            <div className="bg-ink text-red h-12 w-12 rounded-xl flex items-center justify-center font-bold text-2xl shadow-paper">
              3
            </div>
            <h3 className="hand text-2xl font-bold text-ink">3. Cek Anti-Halusinasi</h3>
            <p className="text-muted text-xs sm:text-sm leading-relaxed">
              Sebelum menampilkan saran revisi, Guardrail memverifikasi ulang. Saran yang mengada-ada atau tidak terbukti di CV otomatis dibuang.
            </p>
          </Card>
        </div>
      </section>

      {/* ================= ROI METRICS COUNTER ================= */}
      <section className="shell mx-auto max-w-shell px-5 py-16 border-t-2 border-line">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card rotate={-0.8} className="text-center p-6">
            <p className="hand text-6xl font-bold text-red">3.5×</p>
            <p className="scrawl text-muted text-xl font-bold mt-1">Peluang Dipanggil HR</p>
            <p className="text-muted text-xs mt-1">Dibandingkan mengirimkan CV generik tanpa match keyword.</p>
          </Card>

          <Card rotate={0.8} tape="yellow" className="text-center p-6">
            <p className="hand text-6xl font-bold text-ink">100%</p>
            <p className="scrawl text-muted text-xl font-bold mt-1">Fakta Asli Terverifikasi</p>
            <p className="text-muted text-xs mt-1">Bebas dari risiko manipulasi atau pengarang fakta oleh AI.</p>
          </Card>

          <Card rotate={-0.5} tape="blue" className="text-center p-6">
            <p className="hand text-6xl font-bold text-blue">&lt; 15s</p>
            <p className="scrawl text-muted text-xl font-bold mt-1">Waktu Analisis Match</p>
            <p className="text-muted text-xs mt-1">Proses instan untuk langsung melihat skor & revisi teks.</p>
          </Card>

          <Card rotate={0.5} className="text-center p-6">
            <p className="hand text-6xl font-bold text-green">10</p>
            <p className="scrawl text-muted text-xl font-bold mt-1">Analisis Gratis / Bulan</p>
            <p className="text-muted text-xs mt-1">Setiap bulan selama masa beta untuk semua kandidat.</p>
          </Card>
        </div>
      </section>

      {/* ================= TESTIMONI SCRAPBOOK CORKBOARD ================= */}
      <section id="testimoni" className="shell mx-auto max-w-shell px-5 py-16 border-t-2 border-line">
        <div className="text-center space-y-3 mb-12">
          <span className="label bg-yellow/40 border border-yellow/60 text-ink px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            Kisah Sukses Kandidat
          </span>
          <h2 className="hand text-4xl sm:text-5xl font-bold">Apa Kata Mereka Yang Sudah Dilirik HR 💬</h2>
          <p className="scrawl text-muted text-xl max-w-xl mx-auto">
            Testimoni jujur dari para pencari kerja yang berhasil lolos ke tahap interview.
          </p>
        </div>

        {/* Corkboard Styling Container */}
        <div className="corkboard rounded-2xl border-4 p-6 sm:p-10 shadow-lift">
          <div className="grid gap-6 md:grid-cols-3">
            <Polaroid tape="yellow" pin rotate={-2} className="h-full flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-1 text-yellow">
                  {[...Array(5)].map((_, i) => (
                    <FiStar key={i} className="fill-current h-4 w-4" />
                  ))}
                </div>
                <p className="text-xs sm:text-sm italic text-ink leading-relaxed">
                  "Baru sadar ternyata pencapaian optimasi query PostgreSQL saya tertimbun di paragraf bawah. Setelah ditonjolkan lewat saran Dilirik, besoknya langsung dipanggil interview!"
                </p>
              </div>
              <div className="pt-4 border-t border-line/60 mt-4">
                <p className="hand text-xl font-bold text-ink">Budi Pratama</p>
                <p className="label text-muted text-[11px] uppercase">Backend Dev @ Startup Fintech</p>
              </div>
            </Polaroid>

            <Sticky tone="yellow" rotate={1} className="h-full flex flex-col justify-between p-6">
              <div className="space-y-3">
                <div className="flex items-center gap-1 text-ink">
                  {[...Array(5)].map((_, i) => (
                    <FiStar key={i} className="fill-current h-4 w-4" />
                  ))}
                </div>
                <p className="text-xs sm:text-sm text-ink leading-relaxed font-medium">
                  "Yang paling saya suka itu Guardrail Kejujurannya. Dulu pakai ChatGPT malah disuruh nulis pengalaman AWS yang belum pernah saya pegang. Di Dilirik 100% fakta asli saya!"
                </p>
              </div>
              <div className="pt-4 border-t border-yellow/60 mt-4">
                <p className="hand text-xl font-bold text-ink">Siti Rahmawati</p>
                <p className="label text-muted text-[11px] uppercase">UI/UX Designer @ E-commerce</p>
              </div>
            </Sticky>

            <Polaroid tape="red" pin rotate={-1} className="h-full flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-1 text-red">
                  {[...Array(5)].map((_, i) => (
                    <FiStar key={i} className="fill-current h-4 w-4" />
                  ))}
                </div>
                <p className="text-xs sm:text-sm italic text-ink leading-relaxed">
                  "Skor Match nya presisi banget. Begitu dapet skor 88/100 langsung pede ngelamar dan beneran dipanggil 3 HR sekaligus dalam seminggu."
                </p>
              </div>
              <div className="pt-4 border-t border-line/60 mt-4">
                <p className="hand text-xl font-bold text-ink">Rian Kurnia</p>
                <p className="label text-muted text-[11px] uppercase">Frontend Engineer @ GoTo</p>
              </div>
            </Polaroid>
          </div>
        </div>
      </section>

      {/* ================= INTERACTIVE FAQ ACCORDION ================= */}
      <section id="faq" className="shell mx-auto max-w-shell px-5 py-16 border-t-2 border-line">
        <div className="text-center space-y-3 mb-12">
          <h2 className="hand text-4xl sm:text-5xl font-bold">Pertanyaan Sering Diajukan (FAQ) ❓</h2>
          <p className="scrawl text-muted text-xl max-w-xl mx-auto">
            Semua hal yang perlu kamu ketahui tentang Dilirik.
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-4">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx
            return (
              <Card key={idx} rotate={idx % 2 === 0 ? 0.4 : -0.4} className="p-0 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-base sm:text-lg cursor-pointer hover:bg-paper/50 transition-colors"
                >
                  <span className="hand text-2xl text-ink">{faq.q}</span>
                  <FiChevronDown className={`h-5 w-5 shrink-0 transition-transform ${isOpen ? "rotate-180 text-red" : "text-muted"}`} />
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="p-5 pt-0 text-xs sm:text-sm text-muted leading-relaxed border-t border-line/60">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            )
          })}
        </div>
      </section>

      {/* ================= FINAL HERO CALL TO ACTION ================= */}
      <section className="shell mx-auto max-w-shell px-5 pb-24">
        <Card tape="red" pin rotate={-1} className="max-w-3xl mx-auto text-center p-8 sm:p-12 space-y-6">
          <div className="space-y-3">
            <span className="label bg-yellow/40 border border-yellow/60 text-ink px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              Mulai Dalam 15 Detik
            </span>
            <h2 className="hand text-4xl sm:text-6xl font-bold text-ink">
              Siap Bikin CV-mu Dilirik HR Hari Ini? ⚡
            </h2>
            <p className="scrawl text-muted text-xl max-w-lg mx-auto">
              Dapatkan 10 kali analisis match gratis bulan ini. Tanpa kartu kredit.
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

      {/* ================= FOOTER ================= */}
      <footer className="border-t-2 border-line bg-panel/80 py-10 text-center backdrop-blur-xs">
        <div className="shell mx-auto max-w-shell px-5 space-y-4">
          <div className="flex items-center justify-center gap-2">
            <div className="bg-ink text-paper flex h-8 w-8 items-center justify-center rounded-lg shadow-paper text-sm font-bold">
              👀
            </div>
            <span className="hand text-3xl font-bold">Dilirik</span>
          </div>
          <p className="scrawl text-muted text-lg max-w-md mx-auto">
            AI Matcher CV & Tracker Pelamaran Kerja dengan Guardrail Kejujuran.
          </p>
          <div className="flex items-center justify-center gap-4 text-xs label font-bold text-muted">
            <Link href="/legal/privacy" className="hover:underline">Kebijakan Privasi</Link>
            <span>·</span>
            <Link href="/legal/terms" className="hover:underline">Ketentuan Layanan</Link>
            <span>·</span>
            <Link href="/pricing" className="hover:underline">Pricing</Link>
          </div>
          <p className="label text-muted text-xs">
            © {new Date().getFullYear()} Dilirik. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  )
}
