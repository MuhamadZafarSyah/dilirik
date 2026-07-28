"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
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

// pdf.js memakai API browser saat import — wajib dimuat tanpa SSR
const PdfViewer = dynamic(() => import("@/components/pdf/pdf-viewer"), { ssr: false })

export function StepRevise({ session, patch }: { session: SessionDetail; patch: Patch }) {
  const queryClient = useQueryClient()
  // Pola "draft": state hanya menyimpan editan user; teks dasar diambil dari cache query (tanpa effect sinkronisasi).
  const [draft, setDraft] = useState<string | null>(null)
  const [applied, setApplied] = useState<Record<number, "ok" | "manual">>({})
  // Kunci preview "Sesudah": indeks saran ter-apply (di-debounce → klik beruntun = 1 konversi)
  const [previewKey, setPreviewKey] = useState("")
  // Sorot teks yang berubah di preview "Sesudah" (stabilo kuning ala Word) —
  // hanya memengaruhi preview; file final yang disimpan/di-download tetap bersih.
  const [highlight, setHighlight] = useState(true)

  const cvQuery = useQuery({
    queryKey: ["cv", session.cvId],
    enabled: Boolean(session.cvId),
    queryFn: async () => {
      const { data } = await api.get<{ cv: CvFull }>(`/api/cv/${session.cvId}`)
      return data.cv
    },
  })

  const analysisQuery = useQuery({
    queryKey: ["analysis", session.analysisId],
    enabled: Boolean(session.analysisId),
    staleTime: Infinity,
    queryFn: async () => {
      const { data } = await api.get<{ analysis: AnalysisDetail }>(`/api/analyze/${session.analysisId}`)
      return data.analysis
    },
  })

  const cvFull = cvQuery.data ?? null
  const analysis = analysisQuery.data ?? null
  const text = draft ?? cvFull?.rawText ?? ""

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ cv: { id: string } }>(`/api/analyze/${session.analysisId}/apply`, {
        newRawText: text,
      })
      return data.cv.id
    },
    onSuccess: async (revisedCvId) => {
      queryClient.invalidateQueries({ queryKey: ["cvs"] })
      await patch({ revisedCvId, step: "FINISH" })
    },
  })

  // ===== Preview desain asli (iLovePDF-style compare) =====
  const suggestions = analysis?.suggestionsJson.suggestions ?? []
  const isDocxSource = Boolean(cvFull?.fileKey?.toLowerCase().endsWith(".docx"))

  // Status fitur (Gotenberg dikonfigurasi?) — panggilannya sekaligus warm-up
  // instance Cloud Run scale-to-zero sebelum user klik "Terapkan".
  const previewStatusQuery = useQuery({
    queryKey: ["preview-status"],
    enabled: Boolean(cvFull?.fileKey),
    staleTime: 4 * 60 * 1000,
    queryFn: async () => {
      const { data } = await api.get<{ enabled: boolean }>("/api/preview/status")
      return data
    },
  })
  const previewEnabled = previewStatusQuery.data?.enabled ?? false

  // Debounce daftar saran ter-apply → previewKey (mis. "0,2,5")
  useEffect(() => {
    const key = Object.entries(applied)
      .filter(([, v]) => v === "ok")
      .map(([k]) => Number(k))
      .sort((a, b) => a - b)
      .join(",")
    const t = setTimeout(() => setPreviewKey(key), 800)
    return () => clearTimeout(t)
  }, [applied])

  // "Sebelum": file asli user apa adanya (PDF passthrough, DOCX dikonversi sekali)
  const beforePdfQuery = useQuery({
    queryKey: ["cv-preview", session.cvId],
    enabled: previewEnabled && Boolean(cvFull?.fileKey),
    staleTime: Infinity,
    queryFn: async () => {
      const res = await api.get<Blob>(`/api/preview/cv/${session.cvId}`, { responseType: "blob" })
      return res.data
    },
  })

  // "Sesudah": DOCX asli dipatch in-memory di server lalu dikonversi — tidak menyimpan apa pun
  const afterPdfQuery = useQuery({
    queryKey: ["cv-preview-after", session.cvId, previewKey, highlight],
    enabled: previewEnabled && isDocxSource && previewKey.length > 0,
    staleTime: Infinity,
    placeholderData: (prev) => prev, // preview lama tetap tampil selagi konversi baru jalan
    queryFn: async () => {
      const replacements = previewKey.split(",").flatMap((i) => {
        const s = suggestions[Number(i)]
        return s?.before && s?.after ? [{ before: s.before, after: s.after }] : []
      })
      const res = await api.post<Blob>(
        `/api/preview/cv/${session.cvId}/revised`,
        { replacements, highlight },
        { responseType: "blob" },
      )
      return { blob: res.data, skipped: Number(res.headers["x-preview-skipped"] ?? 0) }
    },
  })

  const loadError = cvQuery.isError || analysisQuery.isError ? "Gagal memuat data revisi — coba muat ulang halaman" : null
  const busy = saveMutation.isPending
  const error = loadError ?? (saveMutation.error ? errorMessage(saveMutation.error) : null)

  if (loadError && !cvFull) return <p className="text-red text-xs font-semibold">{loadError}</p>
  if (!cvFull || !analysis) return <p className="scrawl text-2xl">Memuat…</p>

  const changed = squash(text) !== squash(cvFull.rawText)

  function applyOne(i: number) {
    const suggestion = suggestions[i]
    if (!suggestion) return
    const res = applySuggestionToText(text, suggestion)
    setApplied((prev) => ({ ...prev, [i]: res.applied ? "ok" : "manual" }))
    if (res.applied) setDraft(res.text)
  }

  function applyAll() {
    let current = text
    const state: Record<number, "ok" | "manual"> = {}
    suggestions.forEach((s, i) => {
      const res = applySuggestionToText(current, s)
      state[i] = res.applied ? "ok" : "manual"
      if (res.applied) current = res.text
    })
    setDraft(current)
    setApplied(state)
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
            onChange={(e) => setDraft(e.target.value)}
            rows={22}
            className="w-full p-4 rounded-xl border-2 border-line bg-paper text-ink font-mono text-xs leading-relaxed outline-none focus:border-ink shadow-inner"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => saveMutation.mutate()} isLoading={busy} disabled={busy || !changed} variant="primary">
              {busy ? "Menyimpan versi baru…" : "💾 Simpan sebagai versi baru →"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setDraft(null)
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

      {/* ===== Preview Desain Asli — compare Before/After ala iLovePDF ===== */}
      {previewEnabled && cvFull.fileKey && (
        <div className="space-y-3 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="scrawl text-2xl font-bold">Preview Desain Asli 📄</h3>
            <div className="flex flex-wrap items-center gap-3">
              {isDocxSource && (
                <label className="flex cursor-pointer select-none items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={highlight}
                    onChange={(e) => setHighlight(e.target.checked)}
                    className="accent-ink h-3.5 w-3.5"
                  />
                  <span className="label text-[10px] font-bold uppercase">🖍️ Sorot perubahan</span>
                </label>
              )}
              {afterPdfQuery.isFetching && (
                <span className="label text-muted text-[10px] font-bold uppercase animate-pulse">
                  ⏳ Memperbarui preview…
                </span>
              )}
            </div>
          </div>
          <p className="text-muted text-xs">
            {isDocxSource
              ? "Kiri = file asli kamu. Kanan = file yang SAMA setelah saran diterapkan — hanya teksnya yang diganti, desain/font/tabel tidak disentuh. Teks yang berubah disorot kuning HANYA di preview — file final yang kamu simpan/download tetap bersih tanpa sorotan. Catatan: edit manual di textarea tidak ikut ke preview desain (tetap tersimpan di revisi teks)."
              : 'Ini file PDF asli kamu (tampilan 100% sama). Preview "Sesudah" pada desain asli hanya tersedia untuk sumber .docx — untuk PDF, hasil akhir dirender ulang pakai template Dilirik.'}
          </p>
          <div className={`grid gap-6 ${isDocxSource ? "lg:grid-cols-2" : ""}`}>
            <div className="space-y-2">
              <span className="label bg-ink text-paper px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                Sebelum
              </span>
              <PdfViewer
                file={beforePdfQuery.data ?? null}
                isLoading={beforePdfQuery.isLoading}
                error={beforePdfQuery.isError ? "Gagal memuat preview file asli — coba muat ulang halaman" : null}
              />
            </div>
            {isDocxSource && (
              <div className="space-y-2">
                <span className="label bg-green text-paper px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                  Sesudah
                </span>
                {previewKey.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed border-line p-8 text-center">
                    <p className="scrawl text-muted text-lg">
                      Terapkan minimal satu saran untuk melihat preview desain hasil revisi ✨
                    </p>
                  </div>
                ) : (
                  <>
                    <PdfViewer
                      file={afterPdfQuery.data?.blob ?? null}
                      isLoading={afterPdfQuery.isLoading}
                      error={
                        afterPdfQuery.isError
                          ? "Konversi preview gagal — coba lagi sebentar (service konversi mungkin sedang start)"
                          : null
                      }
                    />
                    {(afterPdfQuery.data?.skipped ?? 0) > 0 && (
                      <p className="text-muted text-[11px]">
                        ⚠️ {afterPdfQuery.data!.skipped} saran tidak bisa dipetakan ke desain (teks di file berbeda) —
                        tetap masuk ke revisi teks.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
