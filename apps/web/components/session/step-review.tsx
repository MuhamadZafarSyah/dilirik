"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { FiAlertTriangle, FiEdit3 } from "react-icons/fi"
import { api, errorMessage, isQuotaExceeded } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, Sticky } from "@/components/ui/card"
import { ScoreGauge } from "@/components/ui/gauge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useI18n } from "@/lib/i18n"
import type { AnalysisDetail, Patch, SessionDetail } from "./types"

export function StepReview({ session, patch }: { session: SessionDetail; patch: Patch }) {
  const { t } = useI18n()
  const [analysis, setAnalysis] = useState<AnalysisDetail | null>(null)
  const [quotaError, setQuotaError] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        if (session.analysisId) {
          const r = await api.get<{ analysis: AnalysisDetail }>(`/api/analyze/${session.analysisId}`)
          if (!cancelled) setAnalysis(r.data.analysis)
        } else {
          const r = await api.post<{ analysis: AnalysisDetail }>("/api/analyze", {
            cvId: session.cvId,
            jobPostingId: session.jobPostingId,
          })
          if (cancelled) return
          setAnalysis(r.data.analysis)
          await patch({ analysisId: r.data.analysis.id })
        }
      } catch (err) {
        if (isQuotaExceeded(err)) setQuotaError(true)
        else setError(errorMessage(err))
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [session.analysisId, session.cvId, session.jobPostingId, patch])

  if (quotaError) {
    return (
      <Sticky tone="red" className="space-y-3 py-6 text-center">
        <FiAlertTriangle className="mx-auto h-10 w-10 text-red animate-bounce" />
        <h3 className="hand text-3xl font-bold">{t("quotaExhausted")}</h3>
        <p className="text-sm text-muted">Draft sesi ini tersimpan aman. Kamu bisa melanjutkan lagi setelah kuota bulanan ter-reset.</p>
        <Link href="/pricing" className="inline-block mt-2">
          <Button variant="danger">Upgrade ke Pro (Unlimited)</Button>
        </Link>
      </Sticky>
    )
  }

  if (error) {
    return (
      <Card className="space-y-3 text-center py-6">
        <p className="text-red text-sm font-semibold">{error}</p>
        <Button variant="secondary" onClick={() => patch({ step: "JOB" })}>
          ← Kembali ke Input Lowongan
        </Button>
      </Card>
    )
  }

  if (!analysis) {
    return (
      <Card tape="yellow" className="text-center py-12 space-y-4">
        <div className="inline-block animate-spin text-ink text-4xl">⚡</div>
        <h2 className="hand text-3xl font-bold">AI Sedang Menganalisis Match CV Kamu...</h2>
        <p className="scrawl text-muted text-xl max-w-md mx-auto">
          Mengekstrak kualifikasi, mendeteksi gap penyajian vs fakta asli (±15 detik).
        </p>
      </Card>
    )
  }

  const realGaps = analysis.gapsJson.filter((g) => g.type === "real")
  const presentationGaps = analysis.gapsJson.filter((g) => g.type !== "real")
  const suggestions = analysis.suggestionsJson.suggestions ?? []

  return (
    <div className="space-y-8">
      {/* Hero Match Score Gauge */}
      <Card tape="red" pin className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6">
        <ScoreGauge score={analysis.matchScore} size={180} />

        <div className="flex-1 text-center sm:text-left space-y-2">
          <span className="label bg-ink text-paper px-3 py-1 rounded-full text-xs font-bold uppercase">
            Hasil Analisis Match
          </span>
          <h2 className="hand text-3xl font-bold text-ink">
            {session.cv?.title} vs {session.job?.parsedJson?.jobTitle ?? "Lowongan Target"}
          </h2>
          <p className="text-muted text-xs leading-relaxed">
            Ditemukan <strong className="text-red">{realGaps.length} Gap Beneran</strong> dan{" "}
            <strong className="text-yellow">{presentationGaps.length} Gap Penyajian</strong> yang bisa langsung diperbaiki tanpa perlu memalsukan fakta.
          </p>
          <div className="pt-2 flex flex-wrap justify-center sm:justify-start gap-2">
            <Button variant="danger" icon={<FiEdit3 />} onClick={() => patch({ step: "REVISE" })}>
              ✏︎ Lanjut ke Revisi Teks CV →
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabs: Gap Breakdown */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">Semua Gap ({analysis.gapsJson.length})</TabsTrigger>
          <TabsTrigger value="real">Gap Beneran ({realGaps.length})</TabsTrigger>
          <TabsTrigger value="presentation">Gap Penyajian ({presentationGaps.length})</TabsTrigger>
          <TabsTrigger value="suggestions">Saran Revisi ({suggestions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <div className="grid gap-4 sm:grid-cols-2">
            {realGaps.map((gap, i) => (
              <Sticky key={`r-${i}`} tone="red" rotate={i % 2 === 0 ? -0.8 : 0.8} className="space-y-2">
                <span className="label bg-red/20 text-red px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                  {t("realGap")} · {gap.skill}
                </span>
                <p className="text-xs leading-relaxed font-medium">{gap.explanation}</p>
                <div className="pt-1 border-t border-red/30 text-xs font-bold text-ink">
                  💡 Saran Jujur: {gap.advice}
                </div>
              </Sticky>
            ))}
            {presentationGaps.map((gap, i) => (
              <Sticky key={`p-${i}`} tone="yellow" rotate={i % 2 === 0 ? 0.8 : -0.8} className="space-y-2">
                <span className="label bg-yellow/40 text-ink px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                  {t("presentationGap")} · {gap.skill}
                </span>
                <p className="text-xs leading-relaxed font-medium">{gap.explanation}</p>
                <div className="pt-1 border-t border-yellow/40 text-xs font-bold text-ink">
                  💡 Cara Menonjolkan: {gap.advice}
                </div>
              </Sticky>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="real">
          <div className="space-y-3">
            {realGaps.map((gap, i) => (
              <Sticky key={`r2-${i}`} tone="red" className="space-y-2">
                <span className="label bg-red/20 text-red px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                  {gap.skill}
                </span>
                <p className="text-xs font-medium">{gap.explanation}</p>
                <p className="text-xs font-bold">💡 {gap.advice}</p>
              </Sticky>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="presentation">
          <div className="space-y-3">
            {presentationGaps.map((gap, i) => (
              <Sticky key={`p2-${i}`} tone="yellow" className="space-y-2">
                <span className="label bg-yellow/40 text-ink px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                  {gap.skill}
                </span>
                <p className="text-xs font-medium">{gap.explanation}</p>
                <p className="text-xs font-bold">💡 {gap.advice}</p>
              </Sticky>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="suggestions">
          <div className="space-y-3">
            {suggestions.map((s, i) => (
              <Card key={i} rotate={i % 2 === 0 ? 0.4 : -0.4} className="space-y-2">
                <span className="label bg-ink text-paper px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                  Bagian: {s.section}
                </span>
                <p className="text-muted line-through text-xs font-mono">{s.before}</p>
                <p className="text-ink font-bold text-xs font-mono bg-green/10 p-2 rounded-lg border border-green/30">
                  {s.after}
                </p>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
