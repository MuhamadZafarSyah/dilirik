"use client"

import { useEffect, useState } from "react"
import { api, errorMessage } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { CvOption, Patch } from "./types"

export function StepCv({ patch }: { patch: Patch }) {
  const [tab, setTab] = useState<"pilih" | "upload" | "paste">("pilih")
  const [cvs, setCvs] = useState<CvOption[]>([])
  const [cvId, setCvId] = useState("")
  const [title, setTitle] = useState("")
  const [rawText, setRawText] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<{ cvs: CvOption[] }>("/api/cv")
      .then((r) => {
        setCvs(r.data.cvs)
        if (r.data.cvs.length === 0) setTab("upload")
      })
      .catch(() => {})
  }, [])

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      let newCvId = cvId
      if (tab === "upload") {
        if (!file) throw new Error("__PILIH_FILE__")
        const form = new FormData()
        form.append("file", file)
        if (title) form.append("title", title)
        const { data } = await api.post<{ cv: { id: string } }>("/api/cv/upload", form)
        newCvId = data.cv.id
      } else if (tab === "paste") {
        const { data } = await api.post<{ cv: { id: string } }>("/api/cv", { title: title || "CV Master", rawText })
        newCvId = data.cv.id
      }
      await patch({ cvId: newCvId, step: "JOB" })
    } catch (err) {
      setError(err instanceof Error && err.message === "__PILIH_FILE__" ? "Pilih file PDF/DOCX terlebih dahulu." : errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Card tape="yellow" pin className="space-y-6">
      <div>
        <h2 className="hand text-3xl font-bold">Langkah 1 — Pilih atau Input CV Kamu 📄</h2>
        <p className="scrawl text-muted text-lg mt-0.5">
          Gunakan Master CV yang sudah tersimpan, atau upload PDF/DOCX baru.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          ["pilih", "🗂 Pilih Master CV"],
          ["upload", "📎 Upload File PDF/DOCX"],
          ["paste", "✏︎ Paste Teks Mentah"],
        ] as const).map(([m, label]) => (
          <button
            key={m}
            onClick={() => setTab(m)}
            className={`label rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              tab === m ? "bg-ink text-paper shadow-paper -rotate-1" : "bg-paper border-2 border-line text-ink hover:border-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "pilih" ? (
        <div className="space-y-2">
          <label className="label text-xs font-bold uppercase tracking-wider block text-ink">
            Master CV Tersimpan
          </label>
          <Select value={cvId} onValueChange={setCvId}>
            <SelectTrigger className="w-full bg-paper border-2 border-line text-sm font-semibold rounded-xl">
              <SelectValue placeholder="— Pilih Document CV —" />
            </SelectTrigger>
            <SelectContent>
              {cvs.map((cv) => (
                <SelectItem key={cv.id} value={cv.id}>
                  {cv.title} (v{cv.version})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {cvs.length === 0 && (
            <p className="text-muted text-xs">Belum ada CV tersimpan — silakan pakai tab Upload atau Paste.</p>
          )}
        </div>
      ) : (
        <div>
          <label className="label text-xs font-bold uppercase tracking-wider block mb-1 text-ink">Judul CV</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Judul CV (misal: CV Fullstack Developer 2026)"
            className="w-full px-3.5 py-2.5 rounded-xl border-2 border-line bg-paper text-ink text-sm font-semibold outline-none focus:border-ink shadow-inner"
          />
        </div>
      )}

      {tab === "upload" && (
        <label className="border-2 border-dashed border-line bg-paper/60 hover:border-ink block cursor-pointer rounded-2xl p-8 text-center transition-colors">
          <input type="file" accept=".pdf,.docx" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <span className="hand text-2xl font-bold text-ink">{file ? file.name : "Jatuhkan File PDF / DOCX di Sini 📄"}</span>
          <p className="text-muted mt-1 text-xs">Maksimal 5MB · Otomatis tersimpan ke daftar master CV kamu</p>
        </label>
      )}

      {tab === "paste" && (
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          rows={10}
          placeholder="Paste seluruh informasi CV kamu di sini..."
          className="w-full p-4 rounded-xl border-2 border-line bg-paper text-ink font-mono text-xs leading-relaxed outline-none focus:border-ink shadow-inner"
        />
      )}

      {error && <p className="text-red text-xs font-semibold">{error}</p>}

      <Button
        onClick={submit}
        isLoading={busy}
        disabled={busy || (tab === "pilih" && !cvId) || (tab === "paste" && rawText.trim().length < 50)}
        variant="primary"
        size="lg"
        className="w-full"
      >
        Lanjut ke Input Lowongan →
      </Button>
    </Card>
  )
}
