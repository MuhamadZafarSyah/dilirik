"use client"

/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import Lenis from "lenis"
import {
  FiArrowRight,
  FiCheckCircle,
  FiZap,
  FiFileText,
  FiShield,
  FiStar,
  FiChevronDown,
  FiLock,
  FiBriefcase,
  FiCheck,
  FiXCircle,
  FiCpu,
  FiLayers,
  FiRefreshCw,
  FiCopy,
  FiCheckSquare,
} from "react-icons/fi"
import { Button } from "@/components/ui/button"
import { Card, Sticky, Polaroid } from "@/components/ui/card"
import { ScoreGauge } from "@/components/ui/gauge"

/* ================= Animation Variants ================= */

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.04 },
  },
}

const popIn = {
  hidden: { opacity: 0, scale: 0.95, y: 16 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
}

/* ================= Target Companies Marquee Data ================= */

const TARGET_COMPANIES = [
  "GoTo Financial",
  "Tokopedia",
  "Traveloka",
  "Shopee",
  "Bukalapak",
  "Bank Mandiri",
  "Telkomsel",
  "Blibli",
  "Bibit",
  "Xendit",
]

/* ================= Interactive Demo Samples ================= */

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
    afterText: "Meningkatkan kecepatan loading aplikasi web frontend dengan optimasi Core Web Vitals (LCP < 1.2s dan FID < 50ms) menggunakan Next.js SSR.",
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
    afterText: "Memimpin proyek A/B testing checkout flow yang meningkatkan Conversion Rate sebesar 24% dalam 3 bulan berturut-turut.",
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
    afterText: "Mengimplementasikan Redis Caching layer pada query pencarian penerbangan, menurunkan p99 API latency dari 450ms ke 60ms.",
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
    afterText: "Merancang Executive Dashboard otomatisasi Tableau & BigQuery yang menghemat 15 jam waktu pelaporan mingguan direksi.",
    suggestion: "Highlight penghematan 15 jam kerja rutin per minggu.",
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

export default function LandingPage() {
  const [activeDemo, setActiveDemo] = useState(0)
  const [activeTab, setActiveTab] = useState<"match" | "gaps" | "revision">("match")
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [copied, setCopied] = useState(false)

  // Smooth Lenis Scroll Integration
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    })

    function raf(time: number) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }

    requestAnimationFrame(raf)

    return () => {
      lenis.destroy()
    }
  }, [])

  const sample = DEMO_SAMPLES[activeDemo]!

  const copyText = (txt: string) => {
    navigator.clipboard.writeText(txt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <main className="paper-texture min-h-screen overflow-x-hidden text-ink font-sans selection:bg-red selection:text-paper">
      {/* ================= Sticky Navigation Header ================= */}
      <header className="sticky top-0 z-50 border-b-2 border-line bg-panel/90 backdrop-blur-md transition-all">
        <div className="shell mx-auto flex max-w-shell items-center justify-between px-5 py-3.5">
          <Link href="/" className="flex items-center gap-2.5 group">
            <motion.div
              whileHover={{ rotate: 12, scale: 1.1 }}
              className="bg-ink text-paper flex h-10 w-10 items-center justify-center rounded-xl shadow-paper text-xl font-bold"
            >
              👀
            </motion.div>
            <div className="flex flex-col">
              <span className="hand text-3xl font-bold tracking-tight text-ink leading-none">Dilirik</span>
              <span className="label text-[10px] uppercase font-bold text-muted tracking-wider">AI CV Matcher</span>
            </div>
          </Link>

          {/* Desktop Links */}
          <nav className="hidden md:flex items-center gap-6">
            <a href="#showcase" className="label text-xs font-bold uppercase tracking-wider text-muted hover:text-ink transition-colors">
              App Showcase
            </a>
            <a href="#bento" className="label text-xs font-bold uppercase tracking-wider text-muted hover:text-ink transition-colors">
              Fitur Unggulan
            </a>
            <a href="#mengapa" className="label text-xs font-bold uppercase tracking-wider text-muted hover:text-ink transition-colors">
              Mengapa Dilirik
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
          {/* Announcement Pill Badge */}
          <motion.div variants={popIn} className="inline-block">
            <span className="label bg-yellow/40 border-2 border-yellow/80 text-ink px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-paper rotate-[-1deg] inline-flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red" />
              </span>
              AI Matcher CV & Guardrail Kejujuran 100% Fakta
            </span>
          </motion.div>

          {/* Main SaaS Display Headline */}
          <motion.h1
            variants={popIn}
            className="hand text-5xl sm:text-7xl lg:text-8xl leading-[1.04] font-bold text-ink"
          >
            Bikin CV-mu <span className="text-red underline decoration-wavy">Dilirik HR</span>, Tanpa Pernah Bohong.
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
                Mulai Analisis Gratis — 10 Sesi / Bulan
              </Button>
            </Link>
            <a href="#showcase">
              <Button variant="outline" size="lg" icon={<FiArrowRight />}>
                Lihat Interactive App Showcase ↓
              </Button>
            </a>
          </motion.div>

          {/* Key Value Proposition Badges */}
          <motion.div variants={popIn} className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs font-bold text-muted uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <FiCheckCircle className="text-green h-4 w-4" /> 0% Mengarang Pengalaman
            </span>
            <span className="flex items-center gap-1.5">
              <FiCheckCircle className="text-green h-4 w-4" /> Ekspor PDF & DOCX Native
            </span>
            <span className="flex items-center gap-1.5">
              <FiCheckCircle className="text-green h-4 w-4" /> Tanpa Kartu Kredit
            </span>
          </motion.div>
        </motion.div>
      </section>

      {/* ================= TARGET COMPANIES MARQUEE ================= */}
      <div className="border-y-2 border-line bg-panel/60 py-4 overflow-hidden shadow-inner">
        <div className="flex items-center justify-center gap-3 mb-2">
          <span className="label text-xs uppercase font-bold text-muted tracking-widest">
            Didesain untuk kandidat yang menargetkan perusahaan top indonesia
          </span>
        </div>
        <div className="flex whitespace-nowrap animate-marquee gap-8">
          {[...TARGET_COMPANIES, ...TARGET_COMPANIES, ...TARGET_COMPANIES].map((comp, idx) => (
            <span
              key={idx}
              className="label bg-paper border border-line rounded-lg px-4 py-1.5 text-xs font-bold uppercase text-ink shadow-xs inline-flex items-center gap-2"
            >
              🏢 {comp}
            </span>
          ))}
        </div>
      </div>

      {/* ================= INTERACTIVE SAAS APP SHOWCASE ================= */}
      <section id="showcase" className="shell mx-auto max-w-shell px-5 py-16 md:py-24">
        <div className="text-center space-y-3 mb-10">
          <span className="label bg-blue/20 text-blue border border-blue/40 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            Interactive SaaS App Demo
          </span>
          <h2 className="hand text-4xl sm:text-6xl font-bold">Pengalaman Menggunakan Dilirik App ⚡</h2>
          <p className="scrawl text-muted text-xl max-w-xl mx-auto">
            Simulasikan bagaimana AI Dilirik membedah CV kamu secara real-time.
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="flex justify-center flex-wrap gap-2 mb-8">
          {DEMO_SAMPLES.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => {
                setActiveDemo(idx)
              }}
              className={`label rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer select-none ${activeDemo === idx
                ? "bg-ink text-paper shadow-paper -rotate-1 scale-105"
                : "bg-panel border-2 border-line text-ink hover:border-ink"
                }`}
            >
              {s.role} @ {s.company}
            </button>
          ))}
        </div>

        {/* Interactive App Window Frame */}
        <Card tape="red" pin className="max-w-4xl mx-auto p-0 overflow-hidden border-2 border-line shadow-lift">
          {/* Simulated App Title Bar */}
          <div className="bg-panel border-b-2 border-line p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-red" />
              <span className="h-3 w-3 rounded-full bg-yellow" />
              <span className="h-3 w-3 rounded-full bg-green" />
              <span className="label text-xs font-bold text-ink ml-2 uppercase truncate max-w-[200px] sm:max-w-none">
                Sesi Match: {sample.role} vs {sample.company}
              </span>
            </div>

            {/* Sub-view Nav Tabs */}
            <div className="flex items-center gap-1 bg-paper/80 p-1 rounded-lg border border-line text-xs">
              <button
                onClick={() => setActiveTab("match")}
                className={`label px-3 py-1 rounded font-bold text-xs ${activeTab === "match" ? "bg-ink text-paper" : "text-muted hover:text-ink"
                  }`}
              >
                1. Match Score
              </button>
              <button
                onClick={() => setActiveTab("gaps")}
                className={`label px-3 py-1 rounded font-bold text-xs ${activeTab === "gaps" ? "bg-ink text-paper" : "text-muted hover:text-ink"
                  }`}
              >
                2. Gap Jujur
              </button>
              <button
                onClick={() => setActiveTab("revision")}
                className={`label px-3 py-1 rounded font-bold text-xs ${activeTab === "revision" ? "bg-ink text-paper" : "text-muted hover:text-ink"
                  }`}
              >
                3. Revisi Teks
              </button>
            </div>
          </div>

          {/* App Body Content */}
          <div className="p-6 sm:p-8 bg-panel/40 min-h-[380px]">
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
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <ScoreGauge score={sample.score} size={160} />
                    <div className="flex-1 text-center md:text-left space-y-2">
                      <span className="label bg-ink text-paper px-3 py-1 rounded-full text-xs font-bold uppercase">
                        Kualifikasi Match
                      </span>
                      <h3 className="hand text-3xl font-bold text-ink">
                        {sample.cvName}
                      </h3>
                      <p className="text-muted text-xs leading-relaxed">
                        Sistem mendeteksi <strong className="text-green">5 Skill Wajib Cocok</strong>,{" "}
                        <strong className="text-red">1 Real Gap</strong>, dan{" "}
                        <strong className="text-yellow">1 Presentation Gap</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-line/60">
                    <h4 className="label text-xs font-bold uppercase text-green mb-2 flex items-center gap-1">
                      <FiCheckCircle className="h-4 w-4" /> Skill Wajib Yang Cocok
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {sample.matchSkills.map((sk) => (
                        <span key={sk} className="label bg-green/15 border border-green/40 text-green rounded-md px-3 py-1 text-xs font-bold">
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
                    <span className="label bg-red/20 text-red px-2.5 py-0.5 rounded text-[11px] font-bold uppercase">
                      Gap Beneran (Real Gap)
                    </span>
                    <p className="text-xs font-semibold text-ink leading-relaxed">{sample.realGap}</p>
                    <p className="text-xs text-muted pt-2 border-t border-red/30">
                      💡 <strong>Saran Jujur Dilirik:</strong> Jangan palsukan skill ini di CV. Pelajari dasar-dasarnya atau sebutkan pengalaman terdekat di wawancara.
                    </p>
                  </Sticky>

                  <Sticky tone="yellow" rotate={0.8} className="space-y-2 p-5">
                    <span className="label bg-yellow/40 text-ink px-2.5 py-0.5 rounded text-[11px] font-bold uppercase">
                      Gap Penyajian (Presentation Gap)
                    </span>
                    <p className="text-xs font-semibold text-ink leading-relaxed">{sample.presentationGap}</p>
                    <p className="text-xs text-muted pt-2 border-t border-yellow/40">
                      💡 <strong>Saran Menampilkan:</strong> Kamu sudah memiliki pengalamannya, tinggal dipindahkan ke bagian atas CV agar langsung dibaca HR.
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
                    <span className="label bg-ink text-paper px-3 py-1 rounded-full text-xs font-bold uppercase">
                      Saran Revisi 1-Click (Guardrail Checked)
                    </span>
                    <button
                      onClick={() => copyText(sample.afterText)}
                      className="label text-xs font-bold text-muted hover:text-ink flex items-center gap-1"
                    >
                      {copied ? <FiCheck className="text-green" /> : <FiCopy />}
                      {copied ? "Tersalin!" : "Salin Teks Revisi"}
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <span className="label text-xs font-bold uppercase text-red">Teks Asli CV Sebelum Revisi:</span>
                      <p className="p-3 bg-red/10 border border-red/30 rounded-lg text-xs font-mono text-muted line-through">
                        {sample.beforeText}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="label text-xs font-bold uppercase text-green">Teks Hasil Revisi Dilirik (100% Fakta):</span>
                      <p className="p-3 bg-green/10 border border-green/40 rounded-lg text-xs font-mono font-bold text-ink">
                        {sample.afterText}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer Bar */}
          <div className="bg-panel border-t-2 border-line p-4 text-center">
            <Link href="/register">
              <Button variant="danger" size="lg" icon={<FiZap />}>
                Analisis & Revisi CV Kamu Sekarang Gratis →
              </Button>
            </Link>
          </div>
        </Card>
      </section>

      {/* ================= BESPOKE FEATURE BENTO GRID ================= */}
      <section id="bento" className="shell mx-auto max-w-shell px-5 py-16 border-t-2 border-line">
        <div className="text-center space-y-3 mb-12">
          <span className="label bg-yellow/40 border border-yellow/60 text-ink px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            Arsitektur Dilirik
          </span>
          <h2 className="hand text-4xl sm:text-6xl font-bold">Fitur Utama Yang Didesain Khusus 🛠️</h2>
          <p className="scrawl text-muted text-xl max-w-xl mx-auto">
            Bukan sekadar AI penulisa ulang teks biasa, Dilirik didesain khusus untuk efisiensi lamaran kerja.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-4 max-w-5xl mx-auto">
          {/* Card 1: Large 2-column Guardrail */}
          <Card tape="yellow" rotate={-0.6} className="md:col-span-2 p-6 sm:p-8 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <span className="label bg-ink text-paper px-3 py-1 rounded-full text-xs font-bold uppercase">
                Fitur Utama 🛡️
              </span>
              <h3 className="hand text-3xl font-bold text-ink">Guardrail Kejujuran 3-Titik</h3>
              <p className="text-muted text-xs sm:text-sm leading-relaxed">
                Setiap saran revisi yang dihasilkan AI selalu melewati 3 tahap validasi ketat: (1) Lock data asli CV sebagai source of truth, (2) Deteksi pemisahan gap, dan (3) Cek fakta anti-mengarang.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-line">
              <div className="bg-paper p-2.5 rounded-lg border border-line text-center">
                <span className="label text-xs font-bold block text-ink">1. Lock Fakta</span>
                <span className="text-[10px] text-muted">Bebas Halusinasi</span>
              </div>
              <div className="bg-paper p-2.5 rounded-lg border border-line text-center">
                <span className="label text-xs font-bold block text-ink">2. Pisah Gap</span>
                <span className="text-[10px] text-muted">Real vs Presentation</span>
              </div>
              <div className="bg-paper p-2.5 rounded-lg border border-line text-center">
                <span className="label text-xs font-bold block text-ink">3. Cek Ulang</span>
                <span className="text-[10px] text-muted">Verified 100%</span>
              </div>
            </div>
          </Card>

          {/* Card 2: Match Score Gauge */}
          <Card tape="blue" pin rotate={0.8} className="p-6 text-center space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="label bg-blue/20 text-blue border border-blue/40 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase">
                Match Engine
              </span>
              <h3 className="hand text-2xl font-bold text-ink">Skor Match Presisi</h3>
            </div>
            <div className="py-2 flex justify-center">
              <ScoreGauge score={88} size={130} />
            </div>
            <p className="text-muted text-xs">Algoritma menghitung persentase kualifikasi wajib lowongan.</p>
          </Card>

          {/* Card 3: Native DOCX Revision */}
          <Card tape="red" rotate={-0.8} className="p-6 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="label bg-red/20 text-red px-2.5 py-0.5 rounded text-[10px] font-bold uppercase">
                Docx Engine
              </span>
              <h3 className="hand text-2xl font-bold text-ink">Revisi .DOCX Native</h3>
            </div>
            <p className="text-muted text-xs leading-relaxed">
              Unggah file Word (.docx) kamu, Dilirik akan merevisi teksnya langsung tanpa merusak desain, layout, font, dan tabel asli milikmu.
            </p>
            <span className="label bg-paper border border-line text-ink rounded-lg px-2.5 py-1 text-[11px] font-bold block text-center">
              📄 Layout & Font Utuh 100%
            </span>
          </Card>

          {/* Card 4: Application Tracker */}
          <Card rotate={0.5} className="md:col-span-2 p-6 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="label bg-green/20 text-green border border-green/40 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase">
                Kanban Tracker
              </span>
              <h3 className="hand text-2xl font-bold text-ink">Tracker Pelamaran Terintegrasi</h3>
              <p className="text-muted text-xs leading-relaxed">
                Pantau setiap lowongan yang telah kamu lamar langsung di dashboard pribadi kamu.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 pt-2 border-t border-line">
              <span className="label bg-paper border border-line text-ink rounded-md px-2.5 py-1 text-xs font-bold">📌 Disimpan</span>
              <span className="label bg-yellow/30 text-ink rounded-md px-2.5 py-1 text-xs font-bold">📤 Dilamar</span>
              <span className="label bg-blue/20 text-blue rounded-md px-2.5 py-1 text-xs font-bold">🗣 Wawancara</span>
              <span className="label bg-green/20 text-green rounded-md px-2.5 py-1 text-xs font-bold">🎉 Offered</span>
            </div>
          </Card>

          {/* Card 5: ATS Friendly PDF */}
          <Card tape="yellow" rotate={-0.4} className="md:col-span-2 p-6 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="label bg-ink text-paper px-2.5 py-0.5 rounded text-[10px] font-bold uppercase">
                ATS Friendly
              </span>
              <h3 className="hand text-2xl font-bold text-ink">Ekspor PDF Ramah Parser ATS</h3>
              <p className="text-muted text-xs leading-relaxed">
                Render ulang PDF instan di browser menggunakan struktur hirarki teks standar universal yang mudah dibaca oleh HR & software screening ATS.
              </p>
            </div>
            <span className="label bg-yellow/30 text-ink rounded-lg px-3 py-1 text-xs font-bold block text-center">
              ⚡ 1-Click Client-Side Export PDF
            </span>
          </Card>
        </div>
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

      {/* ================= ROI METRICS COUNTER ================= */}
      <section className="shell mx-auto max-w-shell px-5 py-16 border-t-2 border-line">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card rotate={-0.8} className="text-center p-6 hover:scale-[1.02] transition-transform">
            <p className="hand text-6xl font-bold text-red">3.5×</p>
            <p className="scrawl text-muted text-xl font-bold mt-1">Peluang Dipanggil HR</p>
            <p className="text-muted text-xs mt-1">Dibandingkan mengirimkan CV generik tanpa match keyword.</p>
          </Card>

          <Card rotate={0.8} tape="yellow" className="text-center p-6 hover:scale-[1.02] transition-transform">
            <p className="hand text-6xl font-bold text-ink">100%</p>
            <p className="scrawl text-muted text-xl font-bold mt-1">Fakta Asli Terverifikasi</p>
            <p className="text-muted text-xs mt-1">Bebas dari risiko manipulasi atau pengarang fakta oleh AI.</p>
          </Card>

          <Card rotate={-0.5} tape="blue" className="text-center p-6 hover:scale-[1.02] transition-transform">
            <p className="hand text-6xl font-bold text-blue">&lt; 15s</p>
            <p className="scrawl text-muted text-xl font-bold mt-1">Waktu Analisis Match</p>
            <p className="text-muted text-xs mt-1">Proses instan untuk langsung melihat skor & revisi teks.</p>
          </Card>

          <Card rotate={0.5} className="text-center p-6 hover:scale-[1.02] transition-transform">
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
