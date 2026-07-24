"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { api, errorMessage } from "@/lib/api"
import { Button } from "@/components/ui/button"

/** Tambah CV (Flow B): tab upload PDF/DOCX vs paste teks. */
export default function NewCvPage() {
  const router = useRouter()
  const [mode, setMode] = useState<"upload" | "paste">("upload")
  const [title, setTitle] = useState("")
  const [rawText, setRawText] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      if (mode === "upload") {
        if (!file) throw new Error("Pilih file dulu")
        const form = new FormData()
        form.append("file", file)
        if (title) form.append("title", title)
        const { data } = await api.post("/api/cv/upload", form)
        router.push(`/app/cv/${data.cv.id}`)
      } else {
        const { data } = await api.post("/api/cv", { title: title || "CV Saya", rawText })
        router.push(`/app/cv/${data.cv.id}`)
      }
    } catch (err) {
      setError(err instanceof Error && err.message === "Pilih file dulu" ? err.message : errorMessage(err))
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="hand text-4xl">Tambah CV</h1>

      <div className="flex gap-2">
        {(["upload", "paste"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)}
            className={`label rounded-md px-4 py-2 text-sm font-bold ${mode === m ? "bg-ink text-paper rotate-[-1deg]" : "bg-panel border-line border-2"}`}>
            {m === "upload" ? "📎 Upload file" : "✏︎ Paste teks"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="card bg-panel border-line relative space-y-4 rounded-lg border-2 p-6 shadow-paper">
        <span className="tape" aria-hidden />
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul CV (mis. “CV Frontend 2026”)"
          className="border-line bg-paper w-full rounded-md border-2 px-3 py-2 text-sm outline-none focus:border-ink" />

        {mode === "upload" ? (
          <label className="border-line bg-paper block cursor-pointer rounded-md border-2 border-dashed p-8 text-center">
            <input type="file" accept=".pdf,.docx" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <span className="hand text-2xl">{file ? file.name : "Jatuhkan PDF/DOCX di sini 📄"}</span>
            <p className="text-muted mt-1 text-xs">Maks. 5MB · PDF hasil scan tidak terbaca — pakai paste teks saja</p>
          </label>
        ) : (
          <textarea required value={rawText} onChange={(e) => setRawText(e.target.value)} rows={12}
            placeholder="Paste seluruh isi CV kamu di sini…"
            className="border-line bg-paper w-full rounded-md border-2 px-3 py-2 font-mono text-sm outline-none focus:border-ink" />
        )}

        {error ? <p className="text-red text-sm">{error}</p> : null}
        <Button type="submit" disabled={loading}>{loading ? "Memproses CV…" : "Simpan CV"}</Button>
      </form>
    </div>
  )
}
