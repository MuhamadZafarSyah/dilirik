"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  FiArrowLeft,
  FiDownload,
  FiEdit2,
  FiSave,
  FiX,
  FiCopy,
  FiCheck,
  FiTrash2,
} from "react-icons/fi"
import { api, errorMessage } from "@/lib/api"
import { useI18n } from "@/lib/i18n"
import { getJobDetails } from "@/components/cover-letters/cover-letter-card"

type CoverLetterDetail = {
  id: string
  userId: string
  cvId: string
  jobPostingId: string
  analysisId: string | null
  text: string
  language: "id" | "en"
  template: string
  customInstructions: string | null
  relevanceScore: number | null
  wordCount: number
  createdAt: string
  updatedAt: string
  cv?: { id: string; title: string; rawText?: string }
  jobPosting?: { id: string; rawText?: string; parsedJson?: any }
  analysis?: { id: string; matchScore: number }
}


export default function CoverLetterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = use(params)
  const id = resolvedParams.id
  const router = useRouter()
  const { lang, t } = useI18n()

  const [coverLetter, setCoverLetter] = useState<CoverLetterDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState("")
  const [saving, setSaving] = useState(false)

  const [copied, setCopied] = useState(false)
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null)

  useEffect(() => {
    fetchDetail()
  }, [id])

  async function fetchDetail() {
    setLoading(true)
    setError("")
    try {
      const res = await api.get(`/api/cover-letters/${id}`)
      const cl = res.data.coverLetter
      setCoverLetter(cl)
      setEditText(cl.text)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveEdit() {
    if (!coverLetter) return
    setSaving(true)
    try {
      const res = await api.put(`/api/cover-letters/${id}`, {
        text: editText,
      })
      setCoverLetter(res.data.coverLetter)
      setEditing(false)
    } catch (err) {
      alert(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleCopy() {
    if (!coverLetter) return
    try {
      await navigator.clipboard.writeText(coverLetter.text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      alert("Gagal menyalin teks")
    }
  }

  function downloadFile(url: string, filename: string) {
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"
    const fullUrl = `${apiBase}${url}`

    // Create invisible anchor link with credentials
    window.open(fullUrl, "_blank")
  }

  async function handleDelete() {
    if (!confirm(lang === "id" ? "Hapus surat lamaran ini?" : "Delete this cover letter?")) return
    try {
      await api.delete(`/api/cover-letters/${id}`)
      router.push("/app/cover-letters")
    } catch (err) {
      alert(errorMessage(err))
    }
  }

  if (loading) {
    return (
      <div className="py-20 text-center text-muted font-bold animate-pulse">
        {lang === "id" ? "Memuat surat lamaran..." : "Loading cover letter..."}
      </div>
    )
  }

  if (error || !coverLetter) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center space-y-4">
        <div className="bg-red-100 border-2 border-red-300 text-red-800 p-4 rounded-xl font-bold">
          {error || "Surat lamaran tidak ditemukan."}
        </div>
        <Link
          href="/app/cover-letters"
          className="label bg-paper border-2 border-line px-4 py-2 rounded-xl inline-flex items-center gap-2 font-bold"
        >
          <FiArrowLeft /> Kembali ke Daftar
        </Link>
      </div>
    )
  }

  const { jobTitle, company: companyName, level } = getJobDetails(coverLetter, lang)
  const cvTitle = coverLetter.cv?.title || "CV"

  return (
    <div className="space-y-8 max-w-5xl mx-auto p-4 md:p-6">
      {/* Top Bar Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/app/cover-letters"
          className="label text-muted hover:text-ink flex items-center gap-2 text-sm font-bold w-fit"
        >
          <FiArrowLeft className="h-4 w-4" />
          <span>{lang === "id" ? "Kembali ke Daftar Surat Lamaran" : "Back to Cover Letters"}</span>
        </Link>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleCopy}
            className="label bg-paper hover:bg-panel border-2 border-line rounded-xl px-3.5 py-2 font-bold text-xs shadow-xs flex items-center gap-1.5"
          >
            {copied ? <FiCheck className="text-green-600" /> : <FiCopy />}
            <span>{copied ? (lang === "id" ? "Tersalin!" : "Copied!") : lang === "id" ? "Salin Teks" : "Copy Text"}</span>
          </button>

          <button
            onClick={() => downloadFile(`/api/cover-letters/${id}/text`, `Surat_Lamaran_${id.slice(-6)}.txt`)}
            className="label bg-paper hover:bg-panel border-2 border-line rounded-xl px-3.5 py-2 font-bold text-xs shadow-xs flex items-center gap-1.5"
          >
            <FiDownload />
            <span>TXT</span>
          </button>

          <button
            onClick={() => downloadFile(`/api/cover-letters/${id}/docx`, `Surat_Lamaran_${id.slice(-6)}.docx`)}
            className="label bg-blue-100 hover:bg-blue-200 border-2 border-blue-400 text-blue-900 rounded-xl px-3.5 py-2 font-bold text-xs shadow-xs flex items-center gap-1.5"
          >
            <FiDownload />
            <span>DOCX</span>
          </button>

          <button
            onClick={() => downloadFile(`/api/cover-letters/${id}/pdf`, `Surat_Lamaran_${id.slice(-6)}.pdf`)}
            className="label bg-red-100 hover:bg-red-200 border-2 border-red-400 text-red-900 rounded-xl px-3.5 py-2 font-bold text-xs shadow-xs flex items-center gap-1.5"
          >
            <FiDownload />
            <span>PDF</span>
          </button>

          <button
            onClick={handleDelete}
            className="label bg-paper hover:bg-red/10 border-2 border-line text-muted hover:text-red rounded-xl p-2 font-bold shadow-xs"
            title="Hapus"
          >
            <FiTrash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Cover Letter Scrapbook Card */}
      <div className="relative polaroid bg-paper border-2 border-line p-6 md:p-10 rounded-2xl shadow-lift space-y-6">
        {/* Tape Accent */}
        <div className="tape-top absolute -top-3 left-1/2 -translate-x-1/2 w-32 h-6 bg-yellow/40 border border-line/30 rotate-1 pointer-events-none" />

        {/* Card Header Info */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-line pb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="uppercase text-[10px] font-bold bg-panel border border-line px-2 py-0.5 rounded-md text-ink">
                {coverLetter.template} • {coverLetter.language.toUpperCase()}
              </span>
              {level && (
                <span className="uppercase text-[10px] font-bold bg-yellow/30 border border-yellow/60 text-ink px-2 py-0.5 rounded-md">
                  {level}
                </span>
              )}
              <span className="text-xs text-muted font-bold">
                {coverLetter.wordCount} {lang === "id" ? "kata" : "words"}
              </span>
            </div>
            <h1 className="hand text-3xl font-bold text-ink mt-1">{jobTitle}</h1>
            <p className="text-sm font-bold text-muted">{companyName}</p>
          </div>

          <div className="flex items-center gap-3">
            {coverLetter.relevanceScore !== null && (
              <div className="bg-green-100 border-2 border-green-400 text-green-900 rounded-xl px-4 py-2 text-center shadow-xs">
                <span className="block text-[10px] uppercase font-bold text-green-700">Relevance</span>
                <span className="text-xl font-bold">{coverLetter.relevanceScore}%</span>
              </div>
            )}

            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="label bg-yellow hover:bg-yellow/90 border-2 border-line rounded-xl px-4 py-2 font-bold text-xs shadow-paper flex items-center gap-1.5"
              >
                <FiEdit2 />
                <span>{lang === "id" ? "Edit Teks" : "Edit Text"}</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="label bg-green-500 text-white border-2 border-line rounded-xl px-4 py-2 font-bold text-xs shadow-paper flex items-center gap-1.5"
                >
                  <FiSave />
                  <span>{saving ? "Simpan..." : "Simpan"}</span>
                </button>
                <button
                  onClick={() => {
                    setEditing(false)
                    setEditText(coverLetter.text)
                  }}
                  disabled={saving}
                  className="label bg-panel border-2 border-line rounded-xl px-3 py-2 font-bold text-xs"
                >
                  <FiX />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content Body */}
        {editing ? (
          <div className="space-y-3">
            <label className="block text-xs font-bold text-muted uppercase">
              {lang === "id" ? "Edit Isi Surat Lamaran:" : "Edit Cover Letter Content:"}
            </label>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={16}
              className="w-full bg-panel border-2 border-line p-4 rounded-xl font-mono text-sm leading-relaxed text-ink focus:outline-none focus:border-ink"
            />
          </div>
        ) : (
          <div className="bg-panel/40 border-2 border-line p-6 md:p-8 rounded-xl space-y-4 font-serif text-ink text-base md:text-lg leading-relaxed whitespace-pre-wrap selection:bg-yellow">
            {coverLetter.text}
          </div>
        )}

        {/* Card Footer */}
        <div className="pt-4 border-t-2 border-line flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted font-bold gap-2">
          <span>
            {lang === "id" ? "Berdasarkan CV:" : "Based on CV:"}{" "}
            <span className="text-ink font-semibold">{cvTitle}</span>
          </span>
          <span>
            Dibuat pada {new Date(coverLetter.createdAt).toLocaleString(lang === "id" ? "id-ID" : "en-US")}
          </span>
        </div>
      </div>
    </div>
  )
}
