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
  const [isDragging, setIsDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) {
      const ext = droppedFile.name.toLowerCase()
      if (ext.endsWith(".pdf") || ext.endsWith(".docx")) {
        setFile(droppedFile)
        setError(null)
      } else {
        setError("Format file harus PDF atau DOCX.")
      }
    }
  }

  useEffect(() => {
    api
      .get<{ cvs: CvOption[] }>("/api/cv")
      .then((r) => {
        setCvs(r.data.cvs)
        if (r.data.cvs.length === 0) setTab("upload")
      })
      .catch(() => { })
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
        const { data } = await api.post<{ cv: { id: string } }>("/api/cv", { title: title || "CV Saya", rawText })
        newCvId = data.cv.id
      }
      await patch({ cvId: newCvId, step: "JOB" })
    } catch (err) {
      setError(err instanceof Error && err.message === "__PILIH_FILE__" ? "Pilih file dulu ya" : errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Card className="relative space-y-5">
      <span className="tape" aria-hidden />
      <h2 className="hand text-3xl font-bold">Langkah 1 — CV kamu 📄</h2>

      <div className="flex flex-wrap gap-2">
        {([
          ["pilih", "🗂 Pilih master CV"],
          ["upload", "📎 Upload file PDF/DOCX"],
          ["paste", "✏︎ Paste teks mentah"],
        ] as const).map(([m, label]) => (
          <button
            key={m}
            onClick={() => setTab(m)}
            className={`label rounded-xl px-4 py-2 text-xs font-bold transition-all ${tab === m ? "bg-ink text-paper shadow-paper -rotate-1" : "bg-paper border-2 border-line text-ink hover:border-ink"
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "pilih" ? (
        <div className="space-y-2">
          <label className="label text-xs font-bold uppercase tracking-wider block text-ink">
            Master CV tersimpan
          </label>
          <Select value={cvId} onValueChange={setCvId}>
            <SelectTrigger className="w-full bg-paper border-2 border-line text-sm font-semibold rounded-xl">
              <SelectValue placeholder="— pilih CV —" />
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
            <p className="text-muted text-xs">Belum ada CV tersimpan — pakai tab upload / paste.</p>
          )}
        </div>
      ) : (
        <div>
          <label className="label text-xs font-bold uppercase tracking-wider block mb-1 text-ink">Judul CV</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder='Judul CV (mis. “CV Frontend 2026”)'
            className="w-full px-3.5 py-2.5 rounded-xl border-2 border-line bg-paper text-ink text-sm font-semibold outline-none focus:border-ink shadow-inner"
          />
        </div>
      )}

      {tab === "upload" && (
        <>
          <label
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed block cursor-pointer rounded-2xl p-8 text-center transition-all ${isDragging
                ? "border-ink bg-yellow/30 scale-[1.02] shadow-paper -rotate-1"
                : "border-line bg-paper/60 hover:border-ink"
              }`}
          >
            <input type="file" accept=".pdf,.docx" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <span className="hand text-2xl font-bold text-ink">
              {isDragging ? "Lepaskan File di Sini! 📥" : file ? file.name : "Jatuhkan PDF/DOCX di sini 📄"}
            </span>
            <p className="text-muted mt-1 text-xs">Maksimal 5MB · otomatis tersimpan juga ke master CV</p>
          </label>
          <p className="text-muted text-xs">
            💡 Tips: upload versi <span className="font-bold">.docx</span> — Dilirik bisa merevisi file-nya langsung tanpa mengubah desain, font, dan tabelnya.
          </p>
        </>
      )}

      {tab === "paste" && (
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          rows={10}
          placeholder="Paste seluruh isi CV kamu di sini…"
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
        {busy ? "Memproses CV…" : "Lanjut ke lowongan →"}
      </Button>
    </Card>
  )
}
