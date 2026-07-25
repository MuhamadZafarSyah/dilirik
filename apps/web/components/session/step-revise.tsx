"use client"

import { useEffect, useState } from "react"
import { api, errorMessage } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CopyButton } from "@/components/ui/copy-button"
import {
  applySuggestionToText,
  squash,
  type AnalysisDetail,
  type CvFull,
  type Patch,
  type SessionDetail,
} from "./types"

export function StepRevise({ session, patch }: { session: SessionDetail; patch: Patch }) {
  const [cvFull, setCvFull] = useState<CvFull | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisDetail | null>(null)
  const [text, setText] = useState("")
  const [applied, setApplied] = useState<Record<number, "ok" | "manual">>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!session.cvId || !session.analysisId) return
    Promise.all([
      api.get<{ cv: CvFull }>(`/api/cv/${session.cvId}`),
      api.get<{ analysis: AnalysisDetail }>(`/api/analyze/${session.analysisId}`),
    ])
      .then(([cvR, aR]) => {
        setCvFull(cvR.data.cv)
        setAnalysis(aR.data.analysis)
        setText(cvR.data.cv.rawText)
      })
      .catch(() => setError("Gagal memuat data revisi — coba muat ulang halaman"))
  }, [session.cvId, session.analysisId])

  if (error && !cvFull) return <p className="text-red text-xs font-semibold">{error}</p>
  if (!cvFull || !analysis) return <p className="scrawl text-2xl">Memuat…</p>

  const suggestions = analysis.suggestionsJson.suggestions ?? []
  const changed = squash(text) !== squash(cvFull.rawText)
  const isDocxSource = Boolean(cvFull.fileKey?.toLowerCase().endsWith(".docx"))

  function applyOne(i: number) {
    const suggestion = suggestions[i]
    if (!suggestion) return
    const res = applySuggestionToText(text, suggestion)
    setApplied((prev) => ({ ...prev, [i]: res.applied ? "ok" : "manual" }))
    if (res.applied) setText(res.text)
  }

  function applyAll() {
    let current = text
    const state: Record<number, "ok" | "manual"> = {}
    suggestions.forEach((s, i) => {
      const res = applySuggestionToText(current, s)
      state[i] = res.applied ? "ok" : "manual"
      if (res.applied) current = res.text
    })
    setText(current)
    setApplied(state)
  }

  async function save() {
    setBusy(true)
    setError(null)
    try {
      const { data } = await api.post<{ cv: { id: string } }>(`/api/analyze/${session.analysisId}/apply`, {
        newRawText: text,
      })
      await patch({ revisedCvId: data.cv.id, step: "FINISH" })
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="hand text-3xl font-bold">Langkah 4 — Revisi teks CV ✏︎</h2>
        <p className="text-muted text-sm mt-0.5">
          Teks CV DITIMPA jadi <span className="font-bold text-ink">versi baru</span> — versi lama tetap aman untuk compare.
          {isDocxSource
            ? " File .docx asli kamu juga ikut direvisi otomatis TANPA mengubah desain, font, dan tabel."
            : " Tampilan/struktur datanya tidak diubah."}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column: Suggestions List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="scrawl text-2xl font-bold">Saran ({suggestions.length})</h3>
            {suggestions.length > 0 && (
              <Button variant="secondary" size="sm" onClick={applyAll}>
                Terapkan Semua
              </Button>
            )}
          </div>
          {suggestions.length === 0 ? (
            <p className="text-muted text-xs">Tidak ada saran otomatis — edit teks langsung di sebelah kanan.</p>
          ) : (
            <ul className="space-y-3">
              {suggestions.map((s, i) => (
                <li key={i}>
                  <Card className="space-y-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <span className="label bg-ink text-paper px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                        {s.section}
                      </span>
                      {s.targetRequirement && (
                        <span className="label bg-green/20 text-green px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                          🎯 Menjawab: {s.targetRequirement}
                        </span>
                      )}
                    </div>
                    <p className="text-muted line-through font-mono text-[11px]">{s.before}</p>
                    <p className="text-ink font-bold font-mono text-[11px] bg-green/10 p-2 rounded-md border border-green/30">
                      {s.after}
                    </p>
                    {applied[i] === "ok" ? (
                      <p className="label text-green text-[10px] font-bold uppercase">✓ Diterapkan ke teks</p>
                    ) : applied[i] === "manual" ? (
                      <div className="space-y-2">
                        <p className="label text-red text-[10px] font-bold uppercase">Teks asli tidak ketemu persis — edit manual ya</p>
                        <CopyButton text={s.after} label="📋 Salin teks revisi" />
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button variant="secondary" size="sm" onClick={() => applyOne(i)}>
                          Terapkan
                        </Button>
                        <CopyButton text={s.after} label="📋 Salin" />
                      </div>
                    )}
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Right Column: Interactive Editor */}
        <div className="space-y-3">
          <h3 className="scrawl text-2xl font-bold">Teks CV (bisa diedit)</h3>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={22}
            className="w-full p-4 rounded-xl border-2 border-line bg-paper text-ink font-mono text-xs leading-relaxed outline-none focus:border-ink shadow-inner"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={save} isLoading={busy} disabled={busy || !changed} variant="primary">
              {busy ? "Menyimpan versi baru…" : "💾 Simpan sebagai versi baru →"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setText(cvFull.rawText)
                setApplied({})
              }}
            >
              Reset
            </Button>
          </div>
          {!changed && (
            <p className="text-muted text-xs">
              Belum ada perubahan — terapkan saran atau edit teks dulu supaya hasil compare tidak sama persis.
            </p>
          )}
          {error && <p className="text-red text-xs font-semibold">{error}</p>}
        </div>
      </div>
    </div>
  )
}
