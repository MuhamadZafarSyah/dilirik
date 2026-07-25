"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { FiArrowLeft, FiBriefcase, FiLink } from "react-icons/fi"
import { api, errorMessage } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export default function NewJobPage() {
  const router = useRouter()
  const [rawText, setRawText] = useState("")
  const [sourceUrl, setSourceUrl] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!rawText.trim()) {
      setError("Isi deskripsi lowongan tidak boleh kosong.")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.post<{ job: { id: string } }>("/api/jobs", {
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
      <Link href="/app/jobs" className="label text-xs font-bold text-muted hover:text-ink flex items-center gap-1">
        <FiArrowLeft /> Kembali ke Daftar Lowongan
      </Link>

      <div>
        <h1 className="hand text-4xl sm:text-5xl font-bold">Simpan Lowongan Target 🎯</h1>
        <p className="scrawl text-muted text-lg mt-1">
          Tempelkan deskripsi pekerjaan. AI akan memilah Judul, Perusahaan, Skill Wajib, dan Nice-to-Have secara otomatis.
        </p>
      </div>

      <Card tape="blue" pin className="space-y-4">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label text-xs font-bold uppercase tracking-wider block mb-1 text-ink flex items-center gap-1">
              <FiBriefcase className="h-4 w-4" /> Teks Deskripsi Lowongan (Job Posting)
            </label>
            <textarea
              required
              rows={12}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste seluruh informasi lowongan kerja di sini (Judul, Kualifikasi, Skill, Tanggung Jawab)..."
              className="w-full p-4 rounded-xl border-2 border-line bg-paper text-ink font-mono text-xs leading-relaxed outline-none focus:border-ink shadow-inner"
            />
          </div>

          <div>
            <label className="label text-xs font-bold uppercase tracking-wider block mb-1 text-ink flex items-center gap-1">
              <FiLink className="h-4 w-4" /> Link URL Sumber Lowongan (Opsional)
            </label>
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://www.linkedin.com/jobs/view/..."
              className="w-full px-3.5 py-2.5 rounded-xl border-2 border-line bg-paper text-ink text-sm font-semibold outline-none focus:border-ink shadow-inner"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl border border-red bg-red/10 text-red text-xs font-semibold">
              {error}
            </div>
          )}

          <Button type="submit" isLoading={loading} variant="primary" size="lg" className="w-full">
            {loading ? "Membaca & Memilah Skill Lowongan..." : "Simpan & Parse Lowongan"}
          </Button>
        </form>
      </Card>
    </div>
  )
}
