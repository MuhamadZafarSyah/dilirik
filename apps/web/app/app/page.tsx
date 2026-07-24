"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { FiArrowRight, FiBriefcase, FiFileText, FiLayers, FiZap } from "react-icons/fi"
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  scoreTone,
  type ApplicationStatus,
} from "@dilirik/shared"
import { api } from "@/lib/api"
import { useI18n } from "@/lib/i18n"
import { Card, Sticky } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"

/** Bentuk respons GET /api/dashboard (PRD §7.6). */
type DashboardData = {
  pipeline: Record<ApplicationStatus, number>
  averageScore: number | null
  topGaps: Array<{ skill: string; count: number }>
  counts: { cvs: number; jobs: number }
  quota: { quota: number | null; used: number; remaining: number | null; resetAt: string }
  recentAnalyses: Array<{ id: string; matchScore: number; cvTitle: string; createdAt: string }>
}

const toneText = { red: "text-red", yellow: "text-yellow", green: "text-green" } as const

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
      <Card className="mx-auto max-w-md rotate-[-0.5deg] text-center">
        <p className="hand text-2xl">Yah, dashboard gagal dimuat 😵</p>
        <p className="text-muted mt-2 text-sm">
          Pastikan API berjalan di <code>localhost:4000</code>, lalu muat ulang halaman ini.
        </p>
      </Card>
    )
  }

  if (!data) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="bg-line/40 h-10 w-64 animate-pulse rounded-md" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-line/30 h-28 animate-pulse rounded-lg" />
          ))}
        </div>
        <p className="text-muted text-sm">{t("loading")}</p>
      </div>
    )
  }

  const hasCv = data.counts.cvs > 0
  const avgTone = data.averageScore === null ? null : scoreTone(data.averageScore)
  const isUnlimited = data.quota.quota === null

  const stats = [
    { label: "CV", value: data.counts.cvs, icon: FiFileText, href: "/app/cv", rotate: "rotate-[-0.6deg]" },
    { label: t("jobs"), value: data.counts.jobs, icon: FiBriefcase, href: "/app/jobs", rotate: "rotate-[0.5deg]" },
  ]

  return (
    <div className="space-y-8">
      {/* ===== Header ===== */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="hand text-4xl md:text-5xl">{t("dashboard")} 📌</h1>
          <p className="scrawl text-muted mt-1 text-xl">Bikin CV-mu dilirik.</p>
        </div>
        <Link
          href="/app/analyze"
          className="label bg-red text-paper inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-bold shadow-paper transition-transform hover:rotate-[-2deg]"
        >
          <FiZap aria-hidden /> {t("newAnalysis")}
        </Link>
      </div>

      {/* ===== Statistik ===== */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, href, rotate }) => (
          <Link key={href} href={href}>
            <Card className={`${rotate} transition-transform hover:rotate-0`}>
              <div className="label text-muted flex items-center gap-2 text-xs font-bold uppercase">
                <Icon aria-hidden /> {label}
              </div>
              <p className="hand mt-2 text-5xl">{value}</p>
            </Card>
          </Link>
        ))}
        <Card className="rotate-[-0.4deg]">
          <div className="label text-muted text-xs font-bold uppercase">Skor rata-rata</div>
          {data.averageScore === null ? (
            <p className="text-muted mt-3 text-sm">Belum ada analisis</p>
          ) : (
            <p className={`hand mt-2 text-5xl ${avgTone ? toneText[avgTone] : ""}`}>
              {data.averageScore}
              <span className="text-muted text-2xl">/100</span>
            </p>
          )}
        </Card>
        <Card className="rotate-[0.6deg]">
          <div className="label text-muted text-xs font-bold uppercase">{t("quotaLeft")}</div>
          <p className="hand mt-2 text-5xl">
            {isUnlimited ? "♾︎" : (data.quota.remaining ?? 0)}
            {!isUnlimited && <span className="text-muted text-2xl">/{data.quota.quota}</span>}
          </p>
          <p className="text-muted mt-1 text-xs">
            reset {new Date(data.quota.resetAt).toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { day: "numeric", month: "short" })}
          </p>
        </Card>
      </section>

      {/* ===== Onboarding kalau belum punya CV ===== */}
      {!hasCv ? (
        <EmptyState
          title={t("emptyCvTitle")}
          note="Mulai dengan upload atau tempel CV-mu — nanti kita analisis bareng lowongan incaranmu."
          ctaLabel={t("emptyCvCta")}
          ctaHref="/app/cv/new"
        />
      ) : (
        <>
          {/* ===== Pipeline lamaran ===== */}
          <section>
            <div className="flex items-center justify-between">
              <h2 className="scrawl text-2xl">
                <FiLayers className="mr-1 inline" aria-hidden /> Pipeline lamaran
              </h2>
              <Link href="/app/applications" className="label text-muted hover:text-ink text-xs font-bold uppercase">
                Lihat semua <FiArrowRight className="inline" aria-hidden />
              </Link>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {APPLICATION_STATUSES.map((status, i) => (
                <Link key={status} href={`/app/applications?status=${status}`}>
                  <Card className={`${i % 2 ? "rotate-[0.7deg]" : "rotate-[-0.7deg]"} p-3 text-center transition-transform hover:rotate-0`}>
                    <p className="hand text-3xl">{data.pipeline[status] ?? 0}</p>
                    <p className="label text-muted mt-1 text-[10px] font-bold uppercase">
                      {APPLICATION_STATUS_LABELS[status][lang]}
                    </p>
                  </Card>
                </Link>
              ))}
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* ===== Gap paling sering ===== */}
            <section>
              <h2 className="scrawl text-2xl">Gap paling sering muncul</h2>
              <div className="mt-3 space-y-3">
                {data.topGaps.length === 0 ? (
                  <p className="text-muted text-sm">Belum ada data gap — jalankan analisis dulu ya.</p>
                ) : (
                  data.topGaps.map((gap, i) => (
                    <Sticky key={gap.skill} tone={i === 0 ? "red" : "yellow"} className={i % 2 ? "rotate-[-0.8deg]" : ""}>
                      <span className="hand text-xl capitalize">{gap.skill}</span>
                      <span className="label text-muted float-right text-xs font-bold">{gap.count}×</span>
                    </Sticky>
                  ))
                )}
              </div>
            </section>

            {/* ===== Analisis terbaru ===== */}
            <section>
              <h2 className="scrawl text-2xl">Analisis terbaru</h2>
              <div className="mt-3 space-y-3">
                {data.recentAnalyses.length === 0 ? (
                  <Card className="rotate-[-0.5deg] text-center">
                    <p className="text-muted text-sm">Belum ada analisis.</p>
                    <Link href="/app/analyze" className="label text-red mt-2 inline-block text-xs font-bold uppercase underline">
                      ⚡ {t("runAnalysis")}
                    </Link>
                  </Card>
                ) : (
                  data.recentAnalyses.slice(0, 5).map((a, i) => (
                    <Link key={a.id} href={`/app/analyze/${a.id}`} className="block">
                      <Card className={`${i % 2 ? "rotate-[0.4deg]" : "rotate-[-0.4deg]"} flex items-center justify-between gap-3 p-4 transition-transform hover:rotate-0`}>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{a.cvTitle}</p>
                          <p className="text-muted text-xs">
                            {new Date(a.createdAt).toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        </div>
                        <span className={`hand text-3xl ${toneText[scoreTone(a.matchScore)]}`}>{a.matchScore}</span>
                      </Card>
                    </Link>
                  ))
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  )
}
