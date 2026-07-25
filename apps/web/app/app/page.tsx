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
  FiCheckCircle,
} from "react-icons/fi"
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  scoreTone,
  type ApplicationStatus,
} from "@dilirik/shared"
import { api } from "@/lib/api"
import { useI18n } from "@/lib/i18n"
import { Card, Sticky } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { EmptyState } from "@/components/ui/empty-state"

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
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 24 },
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
      <Card pin rotate={-1} className="mx-auto max-w-md text-center py-10">
        <FiAlertCircle className="mx-auto h-12 w-12 text-red animate-bounce" />
        <h2 className="hand text-3xl mt-2">Yah, dashboard gagal dimuat 😵</h2>
        <p className="text-muted mt-2 text-sm">
          Pastikan API berjalan di <code>localhost:4000</code>, lalu muat ulang halaman ini.
        </p>
        <Button variant="secondary" onClick={() => window.location.reload()} className="mt-4">
          Coba Lagi
        </Button>
      </Card>
    )
  }

  if (!data) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="bg-line/30 h-12 w-72 animate-pulse rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-line/20 h-32 animate-pulse rounded-xl border border-line" />
          ))}
        </div>
        <p className="scrawl text-muted text-xl">{t("loading")}</p>
      </div>
    )
  }

  const hasCv = data.counts.cvs > 0
  const avgTone = data.averageScore === null ? null : scoreTone(data.averageScore)
  const isUnlimited = data.quota.quota === null

  const stats = [
    { label: "Master CV", value: data.counts.cvs, icon: FiFileText, href: "/app/cv", rotate: -1, color: "text-ink" },
    { label: t("jobs"), value: data.counts.jobs, icon: FiBriefcase, href: "/app/jobs", rotate: 1, color: "text-ink" },
  ]

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* ===== Header ===== */}
      <motion.div variants={itemVariants} className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="label bg-yellow/30 text-ink px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-yellow/60">
              Workspace
            </span>
          </div>
          <h1 className="hand text-4xl sm:text-5xl font-bold mt-1">
            {t("dashboard")} 📌
          </h1>
          <p className="scrawl text-muted text-xl">Bikin CV-mu dilirik HR tanpa ngarang.</p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/app/cv/new">
            <Button variant="outline" icon={<FiPlus />}>
              Tambah CV
            </Button>
          </Link>
          <Link href="/app/analyze">
            <Button variant="danger" icon={<FiZap />} tape="red">
              {t("newAnalysis")}
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* ===== KPI Metrics Grid ===== */}
      <motion.section variants={itemVariants} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, href, rotate }) => (
          <Link key={href} href={href} className="block">
            <Card rotate={rotate} className="group cursor-pointer">
              <div className="flex items-center justify-between text-muted text-xs font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Icon className="h-4 w-4 text-ink" /> {label}
                </span>
                <FiArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
              <p className="hand mt-2 text-5xl font-bold">{value}</p>
            </Card>
          </Link>
        ))}

        <Card rotate={-0.5}>
          <div className="text-muted text-xs font-bold uppercase tracking-wider flex items-center justify-between">
            <span>Skor Rata-Rata</span>
            <FiTrendingUp className="h-4 w-4" />
          </div>
          {data.averageScore === null ? (
            <p className="scrawl text-muted mt-3 text-lg">Belum ada analisis</p>
          ) : (
            <div className="flex items-baseline gap-1 mt-1">
              <p className={`hand text-5xl font-bold ${avgTone ? toneText[avgTone] : ""}`}>
                {data.averageScore}
              </p>
              <span className="scrawl text-muted text-xl">/100</span>
            </div>
          )}
        </Card>

        <Card rotate={0.8} tape="yellow">
          <div className="text-muted text-xs font-bold uppercase tracking-wider">
            {t("quotaLeft")}
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <p className="hand text-5xl font-bold text-ink">
              {isUnlimited ? "♾︎" : (data.quota.remaining ?? 0)}
            </p>
            {!isUnlimited && <span className="scrawl text-muted text-xl">/{data.quota.quota}</span>}
          </div>
          <p className="text-muted mt-1 text-xs">
            reset {new Date(data.quota.resetAt).toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { day: "numeric", month: "short" })}
          </p>
        </Card>
      </motion.section>

      {/* ===== Onboarding or Dashboard Sections ===== */}
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
          {/* ===== Pipeline Lamaran ===== */}
          <motion.section variants={itemVariants} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="scrawl text-2xl font-bold flex items-center gap-2">
                <FiLayers className="text-blue" /> Pipeline Lamaran Target
              </h2>
              <Link
                href="/app/applications"
                className="label text-muted hover:text-ink text-xs font-bold uppercase tracking-wider flex items-center gap-1"
              >
                Lihat Semua <FiArrowRight />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {APPLICATION_STATUSES.map((status, i) => (
                <Link key={status} href={`/app/applications?status=${status}`} className="block">
                  <Card
                    rotate={i % 2 ? 0.8 : -0.8}
                    className="p-3 text-center transition-transform hover:scale-105"
                  >
                    <p className="hand text-3xl font-bold">{data.pipeline[status] ?? 0}</p>
                    <div className="mt-1 flex justify-center">
                      <StatusBadge status={status} lang={lang} />
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </motion.section>

          {/* ===== Bottom Grid: Top Gaps & Recent Analyses ===== */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* ===== Top Gaps ===== */}
            <motion.section variants={itemVariants} className="space-y-3">
              <h2 className="scrawl text-2xl font-bold">Gap Paling Sering Muncul 🔍</h2>
              <div className="space-y-2.5">
                {data.topGaps.length === 0 ? (
                  <Card className="text-center py-6">
                    <p className="scrawl text-muted text-lg">Belum ada data gap. Jalankan analisis CV dulu ya!</p>
                  </Card>
                ) : (
                  data.topGaps.map((gap, i) => (
                    <Sticky
                      key={gap.skill}
                      tone={i === 0 ? "red" : i === 1 ? "yellow" : "blue"}
                      rotate={i % 2 ? -0.8 : 0.8}
                      className="flex items-center justify-between"
                    >
                      <span className="hand text-xl font-bold capitalize">{gap.skill}</span>
                      <span className="label bg-ink text-paper rounded-full px-2.5 py-0.5 text-xs font-bold">
                        {gap.count}× Muncul
                      </span>
                    </Sticky>
                  ))
                )}
              </div>
            </motion.section>

            {/* ===== Recent Analyses ===== */}
            <motion.section variants={itemVariants} className="space-y-3">
              <h2 className="scrawl text-2xl font-bold">Analisis Terbaru ⚡</h2>
              <div className="space-y-2.5">
                {data.recentAnalyses.length === 0 ? (
                  <Card className="text-center py-6">
                    <p className="text-muted text-sm">Belum ada analisis yang disimpan.</p>
                    <Link href="/app/analyze" className="mt-3 inline-block">
                      <Button size="sm" variant="danger">
                        ⚡ Jalankan Analisis Pertama
                      </Button>
                    </Link>
                  </Card>
                ) : (
                  data.recentAnalyses.slice(0, 5).map((a, i) => (
                    <Link key={a.id} href={`/app/analyze/${a.id}`} className="block">
                      <Card
                        rotate={i % 2 ? 0.5 : -0.5}
                        className="flex items-center justify-between p-4 transition-transform hover:scale-[1.01]"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-base font-bold">{a.cvTitle}</p>
                          <p className="text-muted text-xs">
                            {new Date(a.createdAt).toLocaleDateString(lang === "id" ? "id-ID" : "en-US", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`hand text-3xl font-bold ${toneText[scoreTone(a.matchScore)]}`}>
                            {a.matchScore}
                          </span>
                          <span className="scrawl text-muted text-xs">/100</span>
                        </div>
                      </Card>
                    </Link>
                  ))
                )}
              </div>
            </motion.section>
          </div>
        </>
      )}
    </motion.div>
  )
}
