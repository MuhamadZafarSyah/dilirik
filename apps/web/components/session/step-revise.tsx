"use client"

import { useEffect, useState } from "react"
import { FiCheck } from "react-icons/fi"
import { api, errorMessage } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useToast } from "@/components/ui/toast"
import { applySuggestionToText, squash, type AnalysisDetail, type CvFull, type Patch, type SessionDetail } from "./types"

export function StepRevise({ session, patch }: { session: SessionDetail; patch: Patch }) {
  const { toast } = useToast()
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
      .catch(() => setError("Gagal memuat data revisi — silakan muat ulang halaman."))
  }, [session.cvId, session.analysisId])

  if (error && !cvFull) return <p className="text-red text-sm">{error}</p>
  if (!cvFull || !analysis) return <p className="scrawl text-2xl">Memuat Editor Revisi...</p>

  const suggestions = analysis.suggestionsJson.suggestions ?? []
  const changed = squash(text) !== squash(cvFull.rawText)

  function applyOne(i: number) {
    const suggestion = suggestions[i]
    if (!suggestion) return
    const res = applySuggestionToText(text, suggestion)
    setApplied((prev) => ({ ...prev, [i]: res.applied ? "ok" : "manual" }))
    if (res.applied) {
      setText(res.text)
      toast("Saran berhasil diterapkan ke teks!", "success")
    } else {
      toast("Teks asli tidak ketemu persis. Silakan edit manual di editor.", "error")
    }
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
    toast("Semua saran yang cocok telah diterapkan!", "success")
  }

  async function save() {
    setBusy(true)
    setError(null)
    try {
      const { data } = await api.post<{ cv: { id: string } }>(
        `/api/analyze/${session.analysisId}/apply`,
        { newRawText: text }
      )
      await patch({ revisedCvId: data.cv.id, step: "FINISH" })
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="hand text-3xl font-bold">Langkah 4 — Editor Revisi Teks CV ✏︎</h2>
        <p className="scrawl text-muted text-lg mt-0.5">
          Klik <strong className="text-ink">"Terapkan"</strong> untuk menyisipkan saran AI langsung ke teks CV. CV baru tersimpan sebagai versi revisi tanpa mengubah CV asli milikmu.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column: Suggestions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="scrawl text-2xl font-bold">Daftar Saran ({suggestions.length})</h3>
            {suggestions.length > 0 && (
              <Button size="sm" variant="yellow" onClick={applyAll}>
                Terapkan Semua
              </Button>
            )}
          </div>

          {suggestions.length === 0 ? (
            <Card className="py-6 text-center">
              <p className="scrawl text-muted text-lg">Tidak ada saran otomatis. Kamu bisa edit teks langsung pada editor kanan.</p>
            </Card>
          ) : (
            <div className="space-y-3 max-h-[35rem] overflow-auto pr-1">
              {suggestions.map((s, i) => (
                <Card key={i} rotate={i % 2 === 0 ? 0.4 : -0.4} className="space-y-2">
                  <span className="label bg-ink text-paper px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                    Bagian: {s.section}
                  </span>
                  <p className="text-muted line-through text-xs font-mono">{s.before}</p>
                  <p className="text-ink font-bold text-xs font-mono bg-green/10 p-2 rounded-lg border border-green/30">
                    {s.after}
                  </p>

                  {applied[i] === "ok" ? (
                    <span className="label text-green text-xs font-bold uppercase flex items-center gap-1">
                      <FiCheck className="h-4 w-4" /> Diterapkan ke Teks
                    </span>
                  ) : applied[i] === "manual" ? (
                    <span className="label text-red text-xs font-bold uppercase">
                      Edit manual di editor kanan
                    </span>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => applyOne(i)}>
                      Terapkan Saran
                    </Button>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Right column: Interactive Textarea */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="scrawl text-2xl font-bold">Teks CV Hasil Revisi</h3>
            {changed && (
              <span className="label bg-green/20 text-green px-2 py-0.5 rounded text-xs font-bold uppercase">
                Ada Perubahan
              </span>
            )}
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={22}
            className="w-full p-4 rounded-xl border-2 border-line bg-paper text-ink font-mono text-xs leading-relaxed outline-none focus:border-ink shadow-inner"
          />

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={save}
              isLoading={busy}
              disabled={busy || !changed}
              variant="primary"
              size="lg"
              className="flex-1 justify-center"
            >
              💾 Simpan Sebagai Versi Baru →
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setText(cvFull.rawText)
                setApplied({})
              }}
            >
              Reset
            </Button>
          </div>

          {error && <p className="text-red text-xs font-semibold">{error}</p>}
        </div>
      </div>
    </div>
  )
}
