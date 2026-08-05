"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  FiArrowRight,
  FiBriefcase,
  FiFileText,
  FiZap,
  FiPlus,
  FiAlertCircle,
  FiTrendingUp,
  FiMic,
} from "react-icons/fi"
import {
  scoreTone,
  type ApplicationStatus,
} from "@dilirik/shared"
import { api } from "@/lib/api"
import { useI18n } from "@/lib/i18n"
import { Skeleton } from "boneyard-js/react"
import { Card, Sticky } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { EmptyState } from "@/components/ui/empty-state"
import { StarburstBadge } from "@/components/ui/starburst-badge"

type DashboardData = {
  pipeline: Record<ApplicationStatus, number>
  averageScore: number | null
  topGaps: Array<{ skill: string; count: number }>
  counts: { cvs: number; jobs: number }
  quota: { quota: number | null; used: number; remaining: number | null; resetAt: string }
  recentAnalyses: Array<{ id: string; matchScore: number; cvTitle: string; createdAt: string }>
  latestInterview?: {
    id: string
    title: string
    status: string
    persona: string
    durationSec: number
    createdAt: string
    overallScore: number | null
    summary: string | null
  } | null
  totalInterviews?: number
}

const toneText = { red: "text-red", yellow: "text-yellow", green: "text-green" } as const

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.02 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.99 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 350, damping: 26 },
  },
}

export default function DashboardPage() {
  const { lang, t } = useI18n()
  const [data, setData] = useState<DashboardData | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    api
      .get<DashboardData>("/api/dashboard")
      .then((r) => setData(r.data))
      .catch(() => setFailed(true))
  }, [])

  if (failed) {
    return (
      <Card pin rotate={-1} className="mx-auto max-w-md text-center py-8 p-6 space-y-4">
        <FiAlertCircle className="mx-auto h-10 w-10 text-red animate-bounce" />
        <h2 className="hand text-2xl">Dashboard Gagal Dimuat 😵</h2>
        <p className="text-muted text-xs leading-relaxed">
          Pastikan backend API berjalan di <code>localhost:4000</code>.
        </p>
        <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
          Coba Muat Ulang
        </Button>
      </Card>
    )
  }

  const hasCv = data ? data.counts.cvs > 0 : false
  const avgTone = !data || data.averageScore === null ? null : scoreTone(data.averageScore)
  const isUnlimited = data?.quota.quota === null
  const usedQuotaPercent = data && data.quota.quota ? Math.min(100, Math.round((data.quota.used / data.quota.quota) * 100)) : 0

  const totalApplications = data ? Object.values(data.pipeline).reduce((a, b) => a + b, 0) : 0

  return (
    <Skeleton name="dashboard" loading={!data} animate="shimmer" fallback={<DashboardSkeleton />}>
      {data ? (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6 max-w-5xl mx-auto"
        >
          {/* ===== Compact Command Header ===== */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-panel border-2 border-line rounded-2xl p-5 shadow-paper"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="label bg-yellow/40 border border-yellow/70 text-ink px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase">
                  Command Center
                </span>
                <span className="label bg-green/20 text-green px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase">
                  100% Fakta Asli
                </span>
              </div>
              <h1 className="hand text-3xl font-bold text-ink">
                {t("dashboard")} 📌
              </h1>
              <p className="scrawl text-muted text-base">Bikin CV-mu dilirik HR tanpa perlu bohong.</p>
            </div>

            {/* Compact Action Pills */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Link href="/app/analyze">
                <Button variant="danger" size="sm" icon={<FiZap />} tape="red">
                  ⚡ {t("newAnalysis")}
                </Button>
              </Link>
              <Link href="/app/interview/new">
                <Button variant="primary" size="sm" icon={<FiMic />} tape="yellow">
                  🎙️ {lang === "id" ? "Latihan Interview" : "Mock Interview"}
                </Button>
              </Link>
              <Link href="/app/cv/new">
                <Button variant="outline" size="sm" icon={<FiPlus />}>
                  + CV
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* ===== High-Density KPI Metrics Grid ===== */}
          {/* <motion.section variants={itemVariants} className="grid gap-3 grid-cols-2 lg:grid-cols-4"> */}
          {/* 1. Master CV */}
          {/* <Link href="/app/cv" className="block">
              <Card rotate={-0.6} className="group cursor-pointer p-4 space-y-2 hover:border-ink">
                <div className="flex items-center justify-between text-muted text-[10px] font-bold uppercase tracking-wider">
                  <span className="flex items-center gap-1.5 text-ink font-bold">
                    <FiFileText className="h-3.5 w-3.5" /> Master CV
                  </span>
                  <FiArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <p className="hand text-4xl font-bold text-ink">{data.counts.cvs}</p>
                  <span className="label bg-panel border border-line px-2 py-0.5 rounded text-[9px] uppercase font-bold text-muted">
                    File Aktif
                  </span>
                </div>
              </Card>
            </Link> */}

          {/* 2. Lowongan Target
            <Link href="/app/jobs" className="block">
              <Card rotate={0.6} className="group cursor-pointer p-4 space-y-2 hover:border-ink">
                <div className="flex items-center justify-between text-muted text-[10px] font-bold uppercase tracking-wider">
                  <span className="flex items-center gap-1.5 text-ink font-bold">
                    <FiBriefcase className="h-3.5 w-3.5" /> Lowongan Target
                  </span>
                  <FiArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <p className="hand text-4xl font-bold text-ink">{data.counts.jobs}</p>
                  <span className="label bg-panel border border-line px-2 py-0.5 rounded text-[9px] uppercase font-bold text-muted">
                    Target HR
                  </span>
                </div>
              </Card>
            </Link> */}

          {/* 3. Skor Rata-Rata */}
          {/* <Card rotate={-0.4} className="p-4 space-y-2">
              <div className="text-muted text-[10px] font-bold uppercase tracking-wider flex items-center justify-between">
                <span className="text-ink font-bold flex items-center gap-1">
                  <FiTrendingUp className="h-3.5 w-3.5" /> Skor Rata-Rata
                </span>
                <span className="label bg-green/20 text-green px-1.5 py-0.5 rounded text-[9px] font-bold">
                  {avgTone === "green" ? "SOLID" : "STABLE"}
                </span>
              </div>
              {data.averageScore === null ? (
                <p className="scrawl text-muted text-sm pt-1">Belum ada analisis</p>
              ) : (
                <div className="flex items-baseline gap-1 pt-1">
                  <p className={`hand text-4xl font-bold ${avgTone ? toneText[avgTone] : ""}`}>
                    {data.averageScore}
                  </p>
                  <span className="scrawl text-muted text-base">/100</span>
                </div>
              )}
            </Card> */}

          {/* 4. Sisa Kuota Battery Indicator */}
          {/* <Card rotate={0.4} tape="yellow" className="p-4 space-y-2">
              <div className="text-muted text-[10px] font-bold uppercase tracking-wider flex items-center justify-between">
                <span className="text-ink font-bold">{t("quotaLeft")}</span>
                <span className="label text-[9px] uppercase font-bold text-muted">
                  Reset {new Date(data.quota.resetAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                </span>
              </div>
              <div className="flex items-baseline gap-1 pt-1">
                <p className="hand text-4xl font-bold text-ink">
                  {isUnlimited ? "♾︎" : (data.quota.remaining ?? 0)}
                </p>
                {!isUnlimited && <span className="scrawl text-muted text-base">/{data.quota.quota}</span>}
              </div>
              {!isUnlimited && (
                <div className="w-full bg-line/30 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-red h-full rounded-full transition-all" style={{ width: `${100 - usedQuotaPercent}%` }} />
                </div>
              )}
            </Card>
          </motion.section> */}

          {/* ===== Content Section ===== */}
          {!hasCv ? (
            <motion.div variants={itemVariants}>
              <EmptyState
                title={t("emptyCvTitle")}
                note="Mulai dengan upload atau tempel CV-mu — nanti kita analisis bareng lowongan incaranmu."
                ctaLabel={t("emptyCvCta")}
                ctaHref="/app/cv/new"
              />
            </motion.div>
          ) : (
            <>
              {/* ===== Poster-Inspired 3-Card Showcase Grid ===== */}
              <div className="grid gap-5 md:grid-cols-3 items-stretch">
                {/* 1. Match Score Card */}
                {(() => {
                  const scoreBadgeText = data.averageScore !== null
                    ? `${data.averageScore}% Match`
                    : data.counts.cvs > 0
                      ? `${data.counts.cvs} CV Aktif`
                      : "Siap Match"

                  return (
                    <motion.div variants={itemVariants} className="relative flex flex-col h-full">
                      <StarburstBadge text={scoreBadgeText} color="green" rotate={12} className="-top-4 -right-3" />
                      <Card tape="yellow" className="p-5 space-y-3 relative overflow-visible flex-1 flex flex-col justify-between h-full">
                        <div>
                          <h3 className="hand text-2xl font-bold text-ink">Match Score</h3>
                        </div>

                        {/* Arc Gauge Visual */}
                        <div className="flex flex-col items-center justify-center py-2 relative">
                          <div className="w-36 h-20 relative flex items-end justify-center overflow-hidden">
                            <svg viewBox="0 0 100 50" className="w-full h-full">
                              <path
                                d="M 10 50 A 40 40 0 0 1 90 50"
                                fill="none"
                                stroke="#e5e7eb"
                                strokeWidth="10"
                                strokeLinecap="round"
                              />
                              <path
                                d="M 10 50 A 40 40 0 0 1 90 50"
                                fill="none"
                                stroke="url(#gaugeGradient)"
                                strokeWidth="10"
                                strokeLinecap="round"
                                strokeDasharray="126"
                                strokeDashoffset={126 - (126 * (data.averageScore ?? 0)) / 100}
                              />
                              <defs>
                                <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                  <stop offset="0%" stopColor="#ef4444" />
                                  <stop offset="50%" stopColor="#eab308" />
                                  <stop offset="100%" stopColor="#22c55e" />
                                </linearGradient>
                              </defs>
                            </svg>
                            <div className="absolute bottom-0 text-center">
                              <span className="hand text-3xl font-extrabold text-ink leading-none">
                                {data.averageScore !== null ? data.averageScore : "—"}
                              </span>
                              <span className="scrawl text-muted text-xs font-bold block">
                                {data.averageScore !== null ? "/100" : "Belum Analisis"}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between w-full text-[10px] text-muted font-bold px-2 mt-1">
                            <span>Low</span>
                            <span className="text-ink">Rata-Rata Match</span>
                            <span>High</span>
                          </div>
                        </div>

                        <div className="flex justify-end pt-1">
                          <Sticky rotate={2} tone="yellow" className="text-[10px] py-1.5 px-2.5 max-w-[170px] shadow-sm">
                            📌 Rata-rata kecocokan CV vs Lowongan
                          </Sticky>
                        </div>
                      </Card>
                    </motion.div>
                  )
                })()}

                {/* 2. AI Gap Analysis Card */}
                {(() => {
                  const totalGaps = data.topGaps.reduce((acc, g) => acc + g.count, 0)
                  const gapBadgeText = totalGaps > 0
                    ? `${totalGaps} Skill Gap`
                    : data.recentAnalyses.length > 0
                      ? "Bebas Gap 🎉"
                      : "Deteksi Gap"

                  return (
                    <motion.div variants={itemVariants} className="relative flex flex-col h-full">
                      <StarburstBadge text={gapBadgeText} color="pink" rotate={-8} className="-top-4 -right-3" />
                      <Card tape="red" className="p-5 space-y-3 relative overflow-visible flex-1 flex flex-col justify-between h-full">
                        <div className="space-y-1">
                          <h3 className="hand text-2xl font-bold text-ink">AI Gap Analysis</h3>
                          <div className="flex items-baseline gap-2">
                            <span className="hand text-4xl font-extrabold text-red">{totalGaps}</span>
                            <span className="hand text-2xl font-bold text-ink">Skill Gap</span>
                          </div>
                        </div>

                        <div className="space-y-1.5 py-1">
                          <div className="flex flex-wrap gap-1.5">
                            <span className="label bg-red/20 text-red border border-red/40 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              {data.counts.jobs} Lowongan Target
                            </span>
                            <span className="label bg-pink-100 text-pink-700 border border-pink-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              {data.recentAnalyses.length} Sesi Analisis
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {(data.topGaps.length > 0
                              ? data.topGaps.slice(0, 3).map((g) => g.skill)
                              : ["Belum Ada Gap"]
                            ).map((skill) => (
                              <span
                                key={skill}
                                className="label bg-panel border border-line px-2 py-0.5 rounded text-[10px] font-bold text-ink"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-muted font-bold pt-1 border-t border-line/40">
                          <span>Top Skill Gap</span>
                          <Link href="/app/analyze" className="label text-ink hover:underline">
                            {data.recentAnalyses.length > 0 ? `${data.recentAnalyses.length} Sesi Selesai →` : "Jalankan Analisis →"}
                          </Link>
                        </div>
                      </Card>
                    </motion.div>
                  )
                })()}

                {/* 3. Realtime AI Mock Interview Card */}
                {(() => {
                  const interviewBadgeText = (data.totalInterviews ?? 0) > 0
                    ? `${data.totalInterviews} Sesi 🎙️`
                    : data.pipeline.INTERVIEW > 0
                      ? `${data.pipeline.INTERVIEW} Interview 🎯`
                      : "AI Voice 🎙️"

                  const latest = data.latestInterview

                  return (
                    <motion.div variants={itemVariants} className="relative flex flex-col h-full">
                      <StarburstBadge text={interviewBadgeText} color="yellow" rotate={14} className="-top-4 -right-3 sm:-right-12" />
                      <Card tape="blue" className="p-5 space-y-3 relative overflow-visible flex-1 flex flex-col justify-between h-full">
                        <div className="space-y-1">
                          <h3 className="hand text-2xl font-bold text-ink">Realtime AI Mock Interview</h3>
                          <p className="scrawl text-muted text-xs leading-relaxed">
                            Simulasi wawancara kerja AI interaktif dan asesmen otomatis.
                          </p>
                        </div>

                        <div className="bg-yellow/20 border border-yellow/50 rounded-xl p-3 flex items-center gap-3">
                          <div className="text-2xl shrink-0">💬</div>
                          <div className="text-[11px] text-ink font-semibold leading-snug">
                            {latest ? (
                              latest.overallScore !== null ? (
                                <span>
                                  Sesi Terakhir: <strong className="text-green font-bold">{latest.overallScore}% Skor</strong> ({latest.title})
                                </span>
                              ) : (
                                <span>
                                  Sesi Terakhir: <strong>{latest.title}</strong> (Persona {latest.persona.toLowerCase()})
                                </span>
                              )
                            ) : (
                              "Latih rasa percaya diri & jawaban kamu sebelum interview sesungguhnya."
                            )}
                          </div>
                        </div>

                        <Link href="/app/interview/new" className="block pt-1">
                          <Button variant="primary" size="sm" className="w-full justify-center" icon={<FiMic />}>
                            Mulai Interview →
                          </Button>
                        </Link>
                      </Card>
                    </motion.div>
                  )
                })()}
              </div>

              {/* ===== Pipeline Tracker Kanban Funnel ===== */}
              <motion.section variants={itemVariants} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="hand text-2xl font-bold text-ink flex items-center gap-1.5">
                    🎯 Pipeline Tracker Pelamaran ({totalApplications})
                  </h2>
                  <Link
                    href="/app/applications"
                    className="label text-muted hover:text-ink text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
                  >
                    Buka Tracker <FiArrowRight />
                  </Link>
                </div>

                <div className="grid gap-2.5 grid-cols-2 lg:grid-cols-5">
                  {Object.entries(data.pipeline).map(([status, count]) => (
                    <Link key={status} href={`/app/applications?status=${status}`} className="block">
                      <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                        <Card className="hover:border-ink flex items-center justify-between p-3 transition-colors">
                          <StatusBadge status={status as ApplicationStatus} lang={lang} />
                          <span className="hand text-2xl font-bold text-ink">{count}</span>
                        </Card>
                      </motion.div>
                    </Link>
                  ))}
                </div>
              </motion.section>

              {/* ===== Recent Analyses Section ===== */}
              <motion.section variants={itemVariants} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="hand text-2xl font-bold text-ink flex items-center gap-1.5">
                    ⚡ {lang === "id" ? "Hasil Analisis Terbaru" : "Recent Match Analyses"}
                  </h2>
                  <Link
                    href="/app/analyze"
                    className="label text-muted hover:text-ink text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
                  >
                    Lihat Semua <FiArrowRight />
                  </Link>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {data.recentAnalyses.length === 0 ? (
                    <Card className="py-6 text-center col-span-full">
                      <p className="scrawl text-muted text-base">Belum ada analisis match.</p>
                      <Link href="/app/analyze" className="inline-block mt-2">
                        <Button variant="danger" size="sm" icon={<FiZap />}>
                          ⚡ Jalankan Analisis Pertama
                        </Button>
                      </Link>
                    </Card>
                  ) : (
                    data.recentAnalyses.slice(0, 6).map((a, i) => (
                      <Link key={a.id} href={`/app/analyze/${a.id}`} className="block">
                        <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                          <Card
                            rotate={i % 2 ? 0.3 : -0.3}
                            className="p-4 space-y-2 hover:border-ink transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2 min-w-0">
                              <div className="min-w-0 flex-1">
                                <h3 className="hand text-xl font-bold text-ink truncate max-w-56" title={a.cvTitle}>
                                  {a.cvTitle}
                                </h3>
                              </div>
                              <span className={`hand text-2xl font-bold shrink-0 ${toneText[scoreTone(a.matchScore)]}`}>
                                {a.matchScore}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-muted font-medium pt-1.5 border-t border-line/40">
                              <span>
                                {new Date(a.createdAt).toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>
                              <span className="label text-ink font-bold group-hover:underline">Detail →</span>
                            </div>
                          </Card>
                        </motion.div>
                      </Link>
                    ))
                  )}
                </div>
              </motion.section>

              {/* ===== Cover Letter Banner ===== */}
              <motion.section variants={itemVariants}>
                <Card tape="yellow" pin className="p-6 bg-paper flex flex-col md:flex-row items-center justify-between gap-4 border-2 border-line">
                  <div className="space-y-1 text-center md:text-left">
                    <div className="flex items-center gap-2 justify-center md:justify-start">
                      <span className="text-xl">✉️</span>
                      <h3 className="hand text-2xl font-bold text-ink">
                        {lang === "id" ? "Surat Lamaran Pekerjaan AI" : "AI Cover Letters"}
                      </h3>
                    </div>
                    <p className="text-xs text-muted max-w-lg">
                      {lang === "id"
                        ? "Buat surat lamaran formal atau modern yang disesuaikan secara otomatis dengan CV & match score lowongan incaranmu."
                        : "Generate tailored formal or modern cover letters based on your CV match score."}
                    </p>
                  </div>

                  <Link href="/app/cover-letters">
                    <Button variant="yellow" icon={<FiFileText />}>
                      {lang === "id" ? "Kelola Surat Lamaran →" : "Manage Cover Letters →"}
                    </Button>
                  </Link>
                </Card>
              </motion.section>
            </>
          )}

        </motion.div>
      ) : null}
    </Skeleton>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse max-w-5xl mx-auto">
      <div className="h-28 bg-panel/60 border-2 border-line rounded-2xl p-5 shadow-paper" />
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 border-2 border-line bg-panel/60 rounded-2xl p-4 space-y-2 shadow-paper" />
        ))}
      </div>
      <div className="h-48 border-2 border-line bg-panel/60 rounded-2xl p-5 shadow-paper" />
    </div>
  )
}
