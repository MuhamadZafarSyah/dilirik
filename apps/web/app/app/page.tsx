"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  FiArrowRight,
  FiBriefcase,
  FiFileText,
  FiLayers,
  FiZap,
  FiPlus,
  FiAlertCircle,
  FiTrendingUp,
  FiMic,
  FiCheckCircle,
  FiBarChart2,
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
import { cn } from "@/lib/utils"

type DashboardData = {
  pipeline: Record<ApplicationStatus, number>
  averageScore: number | null
  topGaps: Array<{ skill: string; count: number }>
  counts: { cvs: number; jobs: number }
  quota: { quota: number | null; used: number; remaining: number | null; resetAt: string }
  recentAnalyses: Array<{ id: string; matchScore: number; cvTitle: string; createdAt: string }>
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
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null)

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

  const chartAnalyses = data?.recentAnalyses.slice(0, 7).reverse() ?? []
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
          <motion.section variants={itemVariants} className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            {/* 1. Master CV */}
            <Link href="/app/cv" className="block">
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
            </Link>

            {/* 2. Lowongan Target */}
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
            </Link>

            {/* 3. Skor Rata-Rata */}
            <Card rotate={-0.4} className="p-4 space-y-2">
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
            </Card>

            {/* 4. Sisa Kuota Battery Indicator */}
            <Card rotate={0.4} tape="yellow" className="p-4 space-y-2">
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
          </motion.section>

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
              {/* ===== Compact Match Score Chart & Skill Gaps ===== */}
              <div className="grid gap-5 lg:grid-cols-3">
                {/* Compact Bar Chart */}
                <motion.section variants={itemVariants} className="lg:col-span-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <h2 className="hand text-2xl font-bold text-ink flex items-center gap-1.5">
                      📊 {lang === "id" ? "Trend Skor Match" : "Match Score Trend"}
                    </h2>
                    <span className="label bg-yellow/40 text-ink px-2 py-0.5 rounded text-[10px] font-bold">
                      {chartAnalyses.length} Analisis Terakhir
                    </span>
                  </div>

                  <Card tape="blue" className="p-5 space-y-4">
                    {chartAnalyses.length === 0 ? (
                      <div className="py-8 text-center space-y-2">
                        <p className="scrawl text-muted text-base">Belum ada data grafik analisis.</p>
                        <Link href="/app/analyze">
                          <Button variant="danger" size="sm" icon={<FiZap />}>
                            ⚡ Jalankan Analisis Pertama
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Compact Height Bar Chart */}
                        <div className="h-40 flex items-end justify-between gap-2.5 pt-6 pb-2 border-b border-line px-1 relative">
                          {/* HR Target Benchmark Line */}
                          <div className="absolute left-0 right-0 top-[22%] border-t border-dashed border-green/60 z-0 flex items-center justify-between px-1">
                            <span className="label text-[8px] uppercase font-bold text-green bg-panel px-1 rounded border border-green/40">
                              🎯 80 Score Target
                            </span>
                          </div>

                          {chartAnalyses.map((item, i) => {
                            const heightPercent = Math.max(15, Math.round((item.matchScore / 100) * 100))
                            const isHovered = hoveredBarIndex === i
                            const tone = scoreTone(item.matchScore)

                            return (
                              <div
                                key={item.id}
                                className="flex-1 flex flex-col items-center gap-1.5 group relative z-10 cursor-pointer"
                                onMouseEnter={() => setHoveredBarIndex(i)}
                                onMouseLeave={() => setHoveredBarIndex(null)}
                              >
                                {isHovered && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="absolute -top-9 bg-ink text-paper text-[9px] font-bold px-2 py-0.5 rounded shadow-paper whitespace-nowrap z-20"
                                  >
                                    {item.cvTitle}: <span className="text-yellow">{item.matchScore}/100</span>
                                  </motion.div>
                                )}

                                <span className="hand text-sm font-bold text-ink group-hover:scale-105 transition-transform">
                                  {item.matchScore}
                                </span>

                                <motion.div
                                  initial={{ height: "0%" }}
                                  animate={{ height: `${heightPercent}%` }}
                                  transition={{ type: "spring", stiffness: 220, damping: 22, delay: i * 0.04 }}
                                  className={`w-full max-w-[32px] rounded-t-lg border border-line transition-colors shadow-paper ${tone === "green"
                                      ? "bg-green/80 hover:bg-green"
                                      : tone === "yellow"
                                        ? "bg-yellow/80 hover:bg-yellow"
                                        : "bg-red/80 hover:bg-red"
                                    }`}
                                />

                                <span className="label text-[9px] text-muted truncate max-w-[42px] font-bold">
                                  {new Date(item.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                                </span>
                              </div>
                            )
                          })}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-muted font-medium pt-0.5">
                          <span className="flex items-center gap-1">
                            🟢 Hijau (75+) · 🟡 Kuning (50-74) · 🔴 Merah (&lt;50)
                          </span>
                          <Link href="/app/analyze" className="label text-ink text-[10px] font-bold hover:underline">
                            Jalankan Analisis Baru →
                          </Link>
                        </div>
                      </div>
                    )}
                  </Card>
                </motion.section>

                {/* Top Skill Gaps Identifiers */}
                <motion.section variants={itemVariants} className="space-y-2 lg:col-span-1">
                  <div className="flex items-center justify-between">
                    <h2 className="hand text-2xl font-bold text-ink flex items-center gap-1.5">
                      💡 {lang === "id" ? "Gap Paling Sering" : "Top Skill Gaps"}
                    </h2>
                  </div>

                  <Card tape="red" pin className="p-4 space-y-3">
                    {data.topGaps.length === 0 ? (
                      <p className="text-muted text-xs py-6 text-center leading-relaxed">
                        Belum ada data gap. Jalankan analisis match untuk rekomendasi skill!
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        {data.topGaps.slice(0, 5).map((g) => {
                          const maxCount = Math.max(...data.topGaps.map((x) => x.count), 1)
                          const pct = Math.round((g.count / maxCount) * 100)
                          return (
                            <div key={g.skill} className="space-y-1">
                              <div className="flex items-center justify-between text-xs font-bold">
                                <span className="text-ink truncate text-[11px]">{g.skill}</span>
                                <span className="label bg-yellow/40 text-ink rounded px-1.5 py-0.5 text-[9px]">
                                  {g.count}x
                                </span>
                              </div>
                              <div className="w-full bg-line/25 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-ink h-full rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </Card>
                </motion.section>
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
                            <div className="flex items-start justify-between gap-2">
                              <span className="hand text-xl font-bold text-ink truncate">{a.cvTitle}</span>
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
