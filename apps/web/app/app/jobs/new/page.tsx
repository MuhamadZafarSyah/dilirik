"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { api, errorMessage } from "@/lib/api"
import { Button } from "@/components/ui/button"

/** Tambah lowongan: paste teks + URL sumber opsional. */
export default function NewJobPage() {
  const router = useRouter()
  const [rawText, setRawText] = useState("")
  const [sourceUrl, setSourceUrl] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.post("/api/jobs", {
        rawText,
        ...(sourceUrl ? { sourceUrl } : {}),
      })
      router.push(`/app/jobs/${data.job.id}`)
    } catch (err) {
      setError(errorMessage(err))
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="hand text-4xl">Tambah lowongan</h1>
      <form onSubmit={submit} className="card bg-panel border-line relative space-y-4 rounded-lg border-2 p-6 shadow-paper">
        <span className="tape-blue" aria-hidden />
        <textarea required value={rawText} onChange={(e) => setRawText(e.target.value)} rows={14}
          placeholder="Paste seluruh isi job posting di sini — judul, requirement, semuanya…"
          className="border-line bg-paper w-full rounded-md border-2 px-3 py-2 font-mono text-sm outline-none focus:border-ink" />
        <input type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="URL sumber (opsional)"
          className="border-line bg-paper w-full rounded-md border-2 px-3 py-2 text-sm outline-none focus:border-ink" />
        {error ? <p className="text-red text-sm">{error}</p> : null}
        <Button type="submit" disabled={loading}>{loading ? "Membaca lowongan…" : "Simpan lowongan"}</Button>
      </form>
    </div>
  )
}
