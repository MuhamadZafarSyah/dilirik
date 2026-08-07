"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { FiAlertTriangle, FiEdit3, FiFileText } from "react-icons/fi"

import { Skeleton } from "boneyard-js/react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { api, errorMessage, isQuotaExceeded } from "@/lib/api"
import { track } from "@/lib/analytics/track"
import { Button } from "@/components/ui/button"
import { Card, Sticky } from "@/components/ui/card"
import { ScoreGauge } from "@/components/ui/gauge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useI18n } from "@/lib/i18n"
import { FIXABILITY_LABELS, type AnalysisDetail, type Patch, type SessionDetail } from "./types"

export function StepReview({ session, patch }: { session: SessionDetail; patch: Patch }) {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const quotaTrackedRef = useRef(false)

  /**
   * Satu query "get-or-create":
   * - Jika analysisId sudah ada → GET detail analisis (cache per id, immutable).
   * - Jika belum → POST /api/analyze. TanStack Query men-DEDUPE request dengan
   *   queryKey sama, jadi double-mount StrictMode tidak pernah mengirim 2 POST.
   * - retry: false → kegagalan POST tidak di-retry otomatis (hemat kuota analisis).
   */
  const analysisQuery = useQuery({
    queryKey: ["analysis", session.analysisId ?? `new:${session.cvId}:${session.jobPostingId}`],
    enabled: Boolean(session.analysisId ?? (session.cvId && session.jobPostingId)),
    staleTime: Infinity,
    retry: false,
    queryFn: async () => {
      if (session.analysisId) {
        const r = await api.get<{ analysis: AnalysisDetail }>(`/api/analyze/${session.analysisId}`)
        return r.data.analysis
      }
      const r = await api.post<{ analysis: AnalysisDetail }>("/api/analyze", {
        cvId: session.cvId,
        jobPostingId: session.jobPostingId,
      })
      // Seed cache di key permanen + sinkronkan analysisId ke sesi (key berganti tanpa refetch).
      queryClient.setQueryData(["analysis", r.data.analysis.id], r.data.analysis)
      // Kuota terpakai satu — refresh pill kuota di header.
      queryClient.invalidateQueries({ queryKey: ["quota"] })
      await patch({ analysisId: r.data.analysis.id })
      track("analysis_completed", { match_score: r.data.analysis.matchScore, cached: false })
      return r.data.analysis
    },
  })

  const analysis = analysisQuery.data ?? null

  // Track quota_exceeded once when the API returns a quota error (external system state).
  useEffect(() => {
    if (analysisQuery.isError && isQuotaExceeded(analysisQuery.error) && !quotaTrackedRef.current) {
      quotaTrackedRef.current = true
      track("quota_exceeded", { module: "analysis" })
    }
  }, [analysisQuery.isError, analysisQuery.error])

  if (analysisQuery.isError && isQuotaExceeded(analysisQuery.error)) {
    return (
      <Sticky tone="red" className="space-y-3 py-6 text-center">
        <FiAlertTriangle className="mx-auto h-10 w-10 text-red " />
        <h3 className="hand text-3xl font-bold">{t("quotaExhausted")}</h3>
        <p className="text-sm text-muted">Draft sesi ini tersimpan aman. Kamu bisa melanjutkan lagi setelah kuota bulanan ter-reset.</p>
        <Link href="/pricing" className="inline-block mt-2">
          <Button variant="danger">Upgrade ke Pro (Unlimited)</Button>
        </Link>
      </Sticky>
    )
  }

  if (analysisQuery.isError) {
    return (
      <Card className="space-y-3 text-center py-6">
        <p className="text-red text-sm font-semibold">{errorMessage(analysisQuery.error)}</p>
        <Button variant="secondary" onClick={() => patch({ step: "JOB" })}>
          ← Kembali ke Input Lowongan
        </Button>
      </Card>
    )
  }

  const realGaps = analysis ? analysis.gapsJson.filter((g) => g.type === "real") : []
  const presentationGaps = analysis ? analysis.gapsJson.filter((g) => g.type !== "real") : []
  const suggestions = analysis ? (analysis.suggestionsJson.suggestions ?? []) : []
  const careerNote = analysis?.suggestionsJson.careerNote

  return (
    <Skeleton name="step-review-analysis" loading={!analysis} animate="shimmer" fallback={<StepReviewSkeleton />}>
      {analysis ? (
        <div className="space-y-8">
          {/* Hero Match Score Gauge */}
          <Card tape="red" pin className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6">
            <ScoreGauge score={analysis.matchScore} size={180} />

            <div className="flex-1 text-center sm:text-left space-y-3">
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

              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {suggestions.length > 0 ? (
                  <Button
                    variant="danger"
                    size="lg"
                    icon={<FiEdit3 />}
                    onClick={() => patch({ step: "REVISE" })}
                    className="font-bold text-sm shadow-md"
                  >
                    ✏︎ Lanjut ke Revisi Teks CV →
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => patch({ step: "REVISE" })}
                    className="font-bold text-sm"
                  >
                    ✏︎ Tetap Edit Teks Manual →
                  </Button>
                )}

                {session.cvId && session.jobPostingId && (
                  <Link href={`/app/cover-letters?cvId=${session.cvId}&jobId=${session.jobPostingId}`}>
                    <Button variant="outline" size="lg" icon={<FiFileText />} className="w-full sm:w-auto text-xs font-bold">
                      ✉️ Buat Surat Lamaran
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </Card>

          {/* Catatan jujur Dilirik */}
          {careerNote && (
            <Sticky tone="yellow" className="space-y-1">
              <p className="label text-xs font-bold uppercase">🧭 Catatan Jujur Dilirik</p>
              <p className="text-xs leading-relaxed font-medium">{careerNote}</p>
            </Sticky>
          )}

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
                      {gap.severity ? ` · ${gap.severity === "must" ? "WAJIB" : "NICE-TO-HAVE"}` : ""}
                    </span>
                    {gap.fixability && FIXABILITY_LABELS[gap.fixability] && (
                      <p className="label text-muted text-[10px] uppercase font-bold">{FIXABILITY_LABELS[gap.fixability]}</p>
                    )}
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
                      {gap.severity ? ` · ${gap.severity === "must" ? "WAJIB" : "NICE-TO-HAVE"}` : ""}
                    </span>
                    {gap.fixability && FIXABILITY_LABELS[gap.fixability] && (
                      <p className="label text-muted text-[10px] uppercase font-bold">{FIXABILITY_LABELS[gap.fixability]}</p>
                    )}
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
                {suggestions.length === 0 ? (
                  <Card className="py-6 text-center">
                    <p className="text-muted text-xs">
                      Tidak ada revisi teks yang jujur DAN relevan untuk lowongan ini — lihat catatan jujur di atas. Memoles kalimat tidak akan menolong di sini; guardrail sengaja tidak memaksakan saran.
                    </p>
                  </Card>
                ) : (
                  suggestions.map((s, i) => (
                    <Card key={i} rotate={i % 2 === 0 ? 0.4 : -0.4} className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="label bg-ink text-paper px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                          Bagian: {s.section}
                        </span>
                        {s.targetRequirement && (
                          <span className="label bg-green/20 text-green px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                            🎯 Menjawab: {s.targetRequirement}
                          </span>
                        )}
                      </div>
                      <p className="text-muted line-through text-xs font-mono">{s.before}</p>
                      <p className="text-ink font-bold text-xs font-mono bg-green/10 p-2 rounded-lg border border-green/30">
                        {s.after}
                      </p>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      ) : null}
    </Skeleton>
  )
}

function StepReviewSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <Card tape="yellow" className="text-center py-6 space-y-2 border-2 border-line bg-panel">
        <div className="inline-block  text-ink text-3xl">⚡</div>
        <h2 className="hand text-2xl font-bold">AI Sedang Menganalisis Match CV Kamu...</h2>
        <p className="scrawl text-muted text-base max-w-md mx-auto">
          Mengekstrak kualifikasi, mendeteksi gap penyajian vs fakta asli.
        </p>
      </Card>
      <Card tape="red" pin className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6">
        <div className="w-[180px] h-[180px] rounded-full border-8 border-line/40 bg-panel/80 flex items-center justify-center">
          <div className="w-24 h-24 rounded-full bg-line/30" />
        </div>
        <div className="flex-1 space-y-3 w-full">
          <div className="h-6 w-32 bg-line/40 rounded-full" />
          <div className="h-8 w-3/4 bg-line/50 rounded-xl" />
          <div className="h-4 w-full bg-line/30 rounded-md" />
          <div className="h-4 w-2/3 bg-line/30 rounded-md" />
          <div className="h-10 w-48 bg-line/50 rounded-xl" />
        </div>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 border-2 border-line bg-panel/60 rounded-2xl p-4 space-y-2 shadow-paper">
            <div className="h-4 w-24 bg-line/40 rounded" />
            <div className="h-3 w-full bg-line/30 rounded" />
            <div className="h-3 w-4/5 bg-line/30 rounded" />
            <div className="h-4 w-3/5 bg-line/40 rounded pt-2" />
          </div>
        ))}
      </div>
    </div>
  )
}
