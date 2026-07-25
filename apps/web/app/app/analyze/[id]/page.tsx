"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { Gap, Suggestion } from "@dilirik/shared"
import { api, errorMessage } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, Sticky } from "@/components/ui/card"
import { CopyButton } from "@/components/ui/copy-button"
import { ScoreGauge } from "@/components/ui/gauge"
import { useI18n } from "@/lib/i18n"

type AnalysisDetail = {
  id: string
  cvId: string
  jobPostingId: string
  matchScore: number
  gapsJson: Gap[]
  suggestionsJson: {
    suggestions: Suggestion[]
    rejected?: Array<{ suggestion: Suggestion; reason: string }>
    careerNote?: string
    mode?: string
  }
  language: string
  createdAt: string
  cv: { id: string; title: string; version: number }
}

/** Label taksonomi gap (engine v2) — data lama tanpa field ini tetap aman (guard). */
const FIXABILITY_LABELS: Record<string, string> = {
  fixable_by_editing: "✏︎ bisa dijawab revisi teks",
  requires_experience: "🧗 butuh pengalaman nyata",
  fit_constraint: "🧩 faktor kecocokan",
}

const MODE_LABELS: Record<string, string> = {
  optimize: "optimasi — CV sudah satu bidang",
  reframe: "reposisi — cocok sebagian, tonjolkan transferable",
  honest_pivot: "pivot jujur — beda bidang, hanya saran jembatan",
}

/** Hasil analisis (PRD §7.4–7.5): skor, catatan jujur, gap + taksonomi, saran + tombol terapkan & simpan ke tracker. */
export default function AnalysisResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { t } = useI18n()
  const [analysis, setAnalysis] = useState<AnalysisDetail | null>(null)
  const [applying, setApplying] = useState(false)
  const [newText, setNewText] = useState("")
  const [showApply, setShowApply] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get<{ analysis: AnalysisDetail }>(`/api/analyze/${id}`)
      .then(async (r) => {
        setAnalysis(r.data.analysis)
        const cv = await api.get(`/api/cv/${r.data.analysis.cvId}`)
        setNewText(cv.data.cv.rawText)
      })
      .catch(() => router.push("/app/analyze"))
  }, [id, router])

  if (!analysis) return <p className="scrawl text-2xl">{t("loading")}</p>

  const realGaps = analysis.gapsJson.filter((g) => g.type === "real")
  const presentationGaps = analysis.gapsJson.filter((g) => g.type === "presentation")
  const careerNote = analysis.suggestionsJson.careerNote
  const mode = analysis.suggestionsJson.mode

  async function applySuggestions() {
    setApplying(true)
    setError(null)
    try {
      const { data } = await api.post(`/api/analyze/${id}/apply`, { newRawText: newText })
      router.push(`/app/cv/${data.cv.id}/compare?with=${analysis!.cvId}`)
    } catch (err) {
      setError(errorMessage(err))
      setApplying(false)
    }
  }

  async function saveToTracker() {
    try {
      const { data } = await api.post("/api/applications", {
        cvId: analysis!.cvId,
        jobPostingId: analysis!.jobPostingId,
        analysisId: analysis!.id,
      })
      router.push(`/app/applications/${data.application.id}`)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <div className="space-y-8">
      {/* Skor */}
      <div className="flex flex-wrap items-center gap-8">
        <ScoreGauge score={analysis.matchScore} />
        <div>
          <h1 className="hand text-4xl">Hasil analisis</h1>
          <p className="label text-muted text-xs uppercase">CV: {analysis.cv.title} (v{analysis.cv.version}) · output: {analysis.language}</p>
          {mode && MODE_LABELS[mode] ? (
            <p className="label text-muted mt-1 text-xs uppercase">strategi saran: {MODE_LABELS[mode]}</p>
          ) : null}
          <div className="mt-4 flex gap-2">
            <Button onClick={saveToTracker}>📌 {t("saveToTracker")}</Button>
            <Button variant="secondary" onClick={() => setShowApply((v) => !v)}>✏︎ {t("applySuggestion")}</Button>
          </div>
        </div>
      </div>

      {/* Catatan jujur — satu pemikiran dengan gaps & saran (engine v2) */}
      {careerNote ? (
        <Sticky tone="yellow" className="max-w-2xl">
          <p className="label text-xs font-bold uppercase">🧭 catatan jujur dilirik</p>
          <p className="mt-1 text-sm">{careerNote}</p>
        </Sticky>
      ) : null}

      {error ? <p className="text-red text-sm">{error}</p> : null}

      {/* Editor terapkan saran → versi baru */}
      {showApply ? (
        <Card className="space-y-3">
          <p className="hand text-2xl">Edit CV-mu di sini → tersimpan sebagai versi BARU</p>
          <p className="text-muted text-xs">Versi lama tidak berubah dan tetap bisa di-compare.</p>
          <textarea value={newText} onChange={(e) => setNewText(e.target.value)} rows={16}
            className="border-line bg-paper w-full rounded-md border-2 p-3 font-mono text-xs outline-none focus:border-ink" />
          <Button onClick={applySuggestions} disabled={applying}>{applying ? "Menyimpan…" : "Simpan sebagai versi baru"}</Button>
        </Card>
      ) : null}

      {/* Gaps */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="scrawl text-2xl">{t("realGap")} — perlu upskill beneran</h2>
          <div className="mt-3 space-y-3">
            {realGaps.length === 0 ? <p className="text-muted text-sm">Tidak ada — mantap! 🎉</p> : null}
            {realGaps.map((gap, i) => (
              <Sticky key={i} tone="red">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="hand text-xl">{gap.skill}</p>
                  {gap.severity ? (
                    <span className="label bg-ink text-paper rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase">{gap.severity === "must" ? "wajib" : "nice-to-have"}</span>
                  ) : null}
                  {gap.fixability && FIXABILITY_LABELS[gap.fixability] ? (
                    <span className="label text-muted text-[10px] uppercase">{FIXABILITY_LABELS[gap.fixability]}</span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm">{gap.explanation}</p>
                <p className="text-muted mt-1 text-xs">💡 {gap.advice}</p>
              </Sticky>
            ))}
          </div>
        </div>
        <div>
          <h2 className="scrawl text-2xl">{t("presentationGap")} — kamu punya, tapi nggak kelihatan</h2>
          <div className="mt-3 space-y-3">
            {presentationGaps.length === 0 ? <p className="text-muted text-sm">Tidak ada.</p> : null}
            {presentationGaps.map((gap, i) => (
              <Sticky key={i} tone="yellow">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="hand text-xl">{gap.skill}</p>
                  {gap.severity ? (
                    <span className="label bg-ink text-paper rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase">{gap.severity === "must" ? "wajib" : "nice-to-have"}</span>
                  ) : null}
                  {gap.fixability && FIXABILITY_LABELS[gap.fixability] ? (
                    <span className="label text-muted text-[10px] uppercase">{FIXABILITY_LABELS[gap.fixability]}</span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm">{gap.explanation}</p>
                <p className="text-muted mt-1 text-xs">💡 {gap.advice}</p>
              </Sticky>
            ))}
          </div>
        </div>
      </section>

      {/* Saran */}
      <section>
        <h2 className="scrawl text-2xl">Saran perbaikan (lolos cek fakta & relevansi ✓)</h2>
        <div className="mt-3 space-y-3">
          {analysis.suggestionsJson.suggestions.length === 0 ? (
            <p className="text-muted text-sm">
              Tidak ada revisi teks yang jujur DAN relevan untuk lowongan ini — lihat catatan jujur di atas. Memoles kalimat tidak akan menolong di sini.
            </p>
          ) : null}
          {analysis.suggestionsJson.suggestions.map((s, i) => (
            <Card key={i} className={i % 2 ? "rotate-[0.4deg]" : "rotate-[-0.4deg]"}>
              <p className="label text-blue text-xs font-bold uppercase">{s.section}</p>
              {s.targetRequirement ? (
                <p className="label text-green mt-1 text-xs font-bold uppercase">🎯 menjawab: {s.targetRequirement}</p>
              ) : null}
              {s.before ? <p className="text-muted mt-2 text-sm line-through">{s.before}</p> : null}
              <p className="mt-1 text-sm font-semibold">{s.after}</p>
              <p className="text-muted mt-2 text-xs">📎 Berdasarkan fakta di CV-mu: {s.basedOnFacts.join(" · ")}</p>
              <div className="mt-3">
                <CopyButton text={s.after} label="📋 salin teks revisi" />
              </div>
            </Card>
          ))}
        </div>
        <p className="text-muted mt-4 text-xs">
          🛡︎ Janji kejujuran: saran yang tidak didukung fakta CV atau tidak menjawab requirement lowongan otomatis dibuang oleh guardrail.
        </p>
        <p className="text-muted mt-1 text-xs">
          🎨 Jaga desain asli CV-mu: salin teks revisi lalu tempel ke file Word/Canva sumbernya — atau upload CV versi .docx agar Dilirik bisa merevisi file-nya langsung tanpa mengubah desain.
        </p>
      </section>

      <Link href="/app/analyze" className="label inline-block text-sm underline">← Analisis lain</Link>
    </div>
  )
}
