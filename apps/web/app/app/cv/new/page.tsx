"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { FiUploadCloud, FiFileText, FiArrowLeft, FiCheck } from "react-icons/fi"
import { api, errorMessage } from "@/lib/api"
import { track } from "@/lib/analytics/track"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

export default function NewCvPage() {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [rawText, setRawText] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)

  async function submitUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) {
      setError("Pilih file PDF atau DOCX terlebih dahulu.")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const form = new FormData()
      form.append("file", file)
      if (title) form.append("title", title)
      const { data } = await api.post<{ cv: { id: string } }>("/api/cv/upload", form)
      const ext = file.name.toLowerCase().endsWith(".docx") ? "docx" : "pdf"
      track("cv_uploaded", { source: "upload", file_type: ext })
      router.push(`/app/cv/${data.cv.id}`)
    } catch (err) {
      setError(errorMessage(err))
      setLoading(false)
    }
  }

  async function submitPaste(e: React.FormEvent) {
    e.preventDefault()
    if (!rawText.trim()) {
      setError("Isi teks CV tidak boleh kosong.")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.post<{ cv: { id: string } }>("/api/cv", {
        title: title || "CV Master Baru",
        rawText,
      })
      track("cv_uploaded", { source: "paste", file_type: "text" })
      router.push(`/app/cv/${data.cv.id}`)
    } catch (err) {
      setError(errorMessage(err))
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/app/cv" className="label text-xs font-bold text-muted hover:text-ink flex items-center gap-1">
        <FiArrowLeft /> Kembali ke Daftar CV
      </Link>

      <div>
        <h1 className="hand text-4xl sm:text-5xl font-bold">Tambah Master CV 📄</h1>
        <p className="scrawl text-muted text-lg mt-1">
          Upload file CV (PDF/DOCX) atau paste teks mentahnya. AI akan mengekstrak struktur skill & pengalamannya.
        </p>
      </div>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <FiUploadCloud className="h-4 w-4" /> Upload File PDF/DOCX
          </TabsTrigger>
          <TabsTrigger value="paste" className="flex items-center gap-2">
            <FiFileText className="h-4 w-4" /> Paste Teks Mentah
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Upload File */}
        <TabsContent value="upload">
          <Card tape="yellow" pin className="space-y-4">
            <form onSubmit={submitUpload} className="space-y-4">
              <div>
                <label className="label text-xs font-bold uppercase tracking-wider block mb-1 text-ink">
                  Judul Document (Opsional)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Misal: CV Senior Frontend Engineer 2026"
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-line bg-paper text-ink text-sm font-semibold outline-none focus:border-ink shadow-inner"
                />
              </div>

              <div>
                <label className="label text-xs font-bold uppercase tracking-wider block mb-1 text-ink">
                  File Document CV
                </label>
                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    setIsDragOver(true)
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setIsDragOver(false)
                    const dropped = e.dataTransfer.files?.[0]
                    if (dropped) setFile(dropped)
                  }}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
                    isDragOver
                      ? "border-ink bg-yellow/20"
                      : file
                      ? "border-green bg-green/10"
                      : "border-line hover:border-ink bg-paper/60"
                  }`}
                >
                  <label className="cursor-pointer block">
                    <input
                      type="file"
                      accept=".pdf,.docx"
                      className="hidden"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    />
                    <div className="flex flex-col items-center gap-2">
                      {file ? (
                        <>
                          <div className="bg-green text-paper p-3 rounded-full shadow-paper">
                            <FiCheck className="h-6 w-6" />
                          </div>
                          <span className="hand text-2xl font-bold text-ink">{file.name}</span>
                          <span className="text-muted text-xs font-mono">
                            {(file.size / 1024 / 1024).toFixed(2)} MB · Klik untuk mengganti
                          </span>
                        </>
                      ) : (
                        <>
                          <FiUploadCloud className="h-12 w-12 text-ink/70" />
                          <span className="hand text-2xl font-bold text-ink">
                            Seret & Lepas PDF/DOCX ke Sini
                          </span>
                          <p className="text-muted text-xs">
                            Atau klik untuk memilih file dari komputer (Maks 5MB)
                          </p>
                        </>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl border border-red bg-red/10 text-red text-xs font-semibold">
                  {error}
                </div>
              )}

              <Button type="submit" isLoading={loading} variant="primary" size="lg" className="w-full">
                Simpan & Proses CV PDF
              </Button>
            </form>
          </Card>
        </TabsContent>

        {/* Tab 2: Paste Raw Text */}
        <TabsContent value="paste">
          <Card tape="blue" pin className="space-y-4">
            <form onSubmit={submitPaste} className="space-y-4">
              <div>
                <label className="label text-xs font-bold uppercase tracking-wider block mb-1 text-ink">
                  Judul Document
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Misal: CV Backend Developer (Paste)"
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-line bg-paper text-ink text-sm font-semibold outline-none focus:border-ink shadow-inner"
                />
              </div>

              <div>
                <label className="label text-xs font-bold uppercase tracking-wider block mb-1 text-ink">
                  Isi Teks Mentah CV
                </label>
                <textarea
                  required
                  rows={12}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Paste seluruh teks CV kamu di sini (Profil, Pengalaman, Skill, Pendidikan)..."
                  className="w-full p-4 rounded-xl border-2 border-line bg-paper text-ink font-mono text-xs leading-relaxed outline-none focus:border-ink shadow-inner"
                />
              </div>

              {error && (
                <div className="p-3 rounded-xl border border-red bg-red/10 text-red text-xs font-semibold">
                  {error}
                </div>
              )}

              <Button type="submit" isLoading={loading} variant="primary" size="lg" className="w-full">
                Simpan & Ekstrak Teks CV
              </Button>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
