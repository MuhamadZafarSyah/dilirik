"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { FiArrowDown, FiCheckCircle, FiStar, FiZap } from "react-icons/fi"
import { Button } from "@/components/ui/button"
import { Card, Sticky } from "@/components/ui/card"
import { ScoreGauge } from "@/components/ui/gauge"

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
}

const popIn = {
  hidden: { opacity: 0, y: 18, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 280, damping: 24 },
  },
}

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

const HERO_SKILLS = ["Next.js", "TypeScript", "React 19", "Tailwind CSS", "Zustand"]

const TRUST_POINTS = [
  "Tanpa kartu kredit",
  "Ekspor PDF & DOCX native",
  "Guardrail anti-halusinasi",
]

const AVATARS = ["🧑‍💻", "👩‍🎨", "🧑‍🔬", "👨‍💼"]

function MiniBar({ label, value, barClass }: { label: string; value: number; barClass: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="label text-xs font-bold uppercase tracking-wider text-muted">{label}</span>
        <span className="text-xs font-bold text-ink">{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full border border-line bg-paper">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${value}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: "easeOut", delay: 0.35 }}
          className={`h-full rounded-full ${barClass}`}
        />
      </div>
    </div>
  )
}

export function LandingHero() {
  return (
    <section id="hero" className="relative overflow-hidden pt-28 md:pt-36">
      <span
        aria-hidden
        className="text-stroke hand pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 select-none whitespace-nowrap text-[9rem] font-bold opacity-[0.05] sm:text-[13rem]"
      >
        dilirik!
      </span>

      <div className="shell relative grid items-center gap-14 pb-16 md:pb-20 lg:grid-cols-[1.05fr_0.95fr]">
        {/* ===== Copy kiri ===== */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="space-y-6 text-center lg:text-left"
        >
          <motion.span
            variants={popIn}
            className="label inline-flex -rotate-1 items-center gap-2 rounded-full border-2 border-yellow/80 bg-yellow/40 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-ink shadow-paper"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red" />
            </span>
            Beta Publik — 10 Analisis Gratis / Bulan
          </motion.span>

          <motion.h1
            variants={popIn}
            className="hand text-5xl font-bold leading-[1.05] text-ink sm:text-6xl xl:text-7xl"
          >
            Bikin CV-mu{" "}
            <span className="relative inline-block text-red">
              dilirik
              <svg
                aria-hidden
                viewBox="0 0 120 10"
                fill="none"
                className="absolute -bottom-2 left-0 w-full"
              >
                <path
                  d="M2 7 Q 16 2, 30 6 T 60 6 T 90 6 T 118 5"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </span>{" "}
            HR — tanpa pernah bohong.
          </motion.h1>

          <motion.p
            variants={popIn}
            className="mx-auto max-w-xl text-base leading-relaxed text-muted sm:text-lg lg:mx-0"
          >
            Upload CV, tempel lowongan incaran, dan dapatkan skor kecocokan + revisi teks instan yang{" "}
            <strong className="font-bold text-ink">100% berdasarkan fakta asli CV kamu</strong> — bukan
            karangan AI.
          </motion.p>

          <motion.div
            variants={popIn}
            className="flex flex-wrap items-center justify-center gap-4 pt-2 lg:justify-start"
          >
            <Link href="/register">
              <Button variant="danger" size="lg" icon={<FiZap />} tape="red" className="px-8">
                Analisis CV Gratis Sekarang
              </Button>
            </Link>
            <a href="#demo">
              <Button variant="outline" size="lg" icon={<FiArrowDown />}>
                Lihat Demo Interaktif
              </Button>
            </a>
          </motion.div>

          <motion.div
            variants={popIn}
            className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-bold uppercase tracking-wider text-muted lg:justify-start"
          >
            {TRUST_POINTS.map((point) => (
              <span key={point} className="flex items-center gap-1.5">
                <FiCheckCircle className="h-4 w-4 text-green" /> {point}
              </span>
            ))}
          </motion.div>

          <motion.div
            variants={popIn}
            className="flex flex-wrap items-center justify-center gap-3 pt-1 lg:justify-start"
          >
            <span className="flex -space-x-2.5">
              {AVATARS.map((emoji) => (
                <span
                  key={emoji}
                  className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-panel bg-paper text-base shadow-paper"
                >
                  {emoji}
                </span>
              ))}
            </span>
            <span className="flex items-center gap-0.5 text-yellow">
              {[...Array(5)].map((_, i) => (
                <FiStar key={i} className="h-4 w-4 fill-current" />
              ))}
            </span>
            <span className="scrawl text-xl text-muted">dipakai 1.200+ pencari kerja di Indonesia</span>
          </motion.div>
        </motion.div>

        {/* ===== Mockup produk kanan ===== */}
        <motion.div
          initial={{ opacity: 0, y: 30, rotate: 3 }}
          animate={{ opacity: 1, y: 0, rotate: 1 }}
          transition={{ type: "spring", stiffness: 120, damping: 18, delay: 0.25 }}
          className="relative mx-auto w-full max-w-md pb-10 lg:max-w-none"
        >
          <div
            aria-hidden
            className="cutting-board absolute -inset-5 -z-10 rotate-2 rounded-[20px] border border-line bg-panel/50"
          />

          <Card className="overflow-hidden border-2 border-line p-0 shadow-lift">
            <div className="flex items-center gap-2 border-b-2 border-line bg-panel p-3">
              <span className="h-3 w-3 rounded-full bg-red" />
              <span className="h-3 w-3 rounded-full bg-yellow" />
              <span className="h-3 w-3 rounded-full bg-green" />
              <span className="label ml-2 truncate text-xs font-bold uppercase text-muted">
                app.dilirik.id — Sesi Analisis
              </span>
            </div>

            <div className="space-y-5 bg-panel/40 p-5 sm:p-6">
              <div className="flex items-center gap-4">
                <ScoreGauge score={88} size={110} />
                <div className="flex-1 space-y-1.5">
                  <span className="label inline-block rounded-full bg-ink px-3 py-1 text-xs font-bold uppercase text-paper">
                    Match Score
                  </span>
                  <p className="hand text-2xl font-bold leading-tight text-ink">CV_Kamu_2026.docx</p>
                  <p className="text-xs text-muted">vs Senior Frontend Engineer @ GoTo Financial</p>
                </div>
              </div>

              <div className="space-y-3">
                <MiniBar label="Keyword Match" value={92} barClass="bg-green" />
                <MiniBar label="Format ATS" value={88} barClass="bg-blue" />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {HERO_SKILLS.map((skill) => (
                  <span
                    key={skill}
                    className="label rounded-md border border-green/40 bg-green/15 px-2 py-0.5 text-[11px] font-bold text-green"
                  >
                    ✓ {skill}
                  </span>
                ))}
              </div>

              <div className="space-y-1.5 border-t border-line/60 pt-3">
                <p className="rounded-lg border border-red/30 bg-red/10 p-2 text-[11px] text-muted line-through">
                  Meningkatkan kecepatan loading halaman web.
                </p>
                <p className="rounded-lg border border-green/40 bg-green/10 p-2 text-[11px] font-bold leading-relaxed text-ink">
                  Meningkatkan kecepatan loading dengan optimasi Core Web Vitals (LCP &lt; 1.2s) menggunakan
                  Next.js SSR. ✨
                </p>
              </div>
            </div>
          </Card>

          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -bottom-2 -left-4 z-10 sm:-left-8"
          >
            <Sticky tone="red" rotate={-5} className="w-44 p-4">
              <p className="scrawl text-xl leading-tight text-ink">
                1 gap presentasi ketemu! pindahkan metrikmu ke atas 📌
              </p>
            </Sticky>
          </motion.div>

          <span className="label absolute -right-2 -top-5 z-10 inline-block rotate-3 animate-wiggle rounded-full border-2 border-green/50 bg-green/20 px-3 py-1.5 text-xs font-bold uppercase text-green shadow-paper sm:-right-4">
            ✓ 100% Fakta — Guardrail ON
          </span>
        </motion.div>
      </div>

      {/* ===== Marquee perusahaan target ===== */}
      <div className="overflow-hidden border-y-2 border-line bg-panel/60 py-5">
        <p className="label mb-3 text-center text-xs font-bold uppercase tracking-widest text-muted">
          Disiapkan untuk kandidat yang menargetkan perusahaan top Indonesia 🇮🇩
        </p>
        <div className="flex animate-marquee gap-8 whitespace-nowrap">
          {[...TARGET_COMPANIES, ...TARGET_COMPANIES].map((company, idx) => (
            <span
              key={idx}
              className="label inline-flex items-center gap-2 rounded-lg border border-line bg-paper px-4 py-1.5 text-xs font-bold uppercase text-ink shadow-paper"
            >
              🏢 {company}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
