"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  FiFileText,
  FiPlus,
  FiDownload,
  FiTrash2,
  FiEdit2,
  FiArrowRight,
  FiCheckCircle,
  FiX,
  FiClock,
  FiBookOpen,
} from "react-icons/fi"
import { api, errorMessage } from "@/lib/api"
import { useI18n } from "@/lib/i18n"
import { COVER_LETTER_TEMPLATE_LABELS, type CoverLetterTemplate } from "@dilirik/shared"

type CoverLetterItem = {
  id: string
  text: string
  language: string
  template: string
  relevanceScore: number | null
  wordCount: number
  createdAt: string
  cv?: { id: string; title: string }
  jobPosting?: { id: string; parsedJson: any }
  analysis?: { id: string; matchScore: number }
}

type CvItem = { id: string; title: string }
type JobItem = { id: string; parsedJson: { title?: string; company?: string }; createdAt: string }

type QuotaData = {
  quota: number | null
  used: number
  remaining: number | null
  resetAt: string
}

export default function CoverLettersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { lang, t } = useI18n()

  const [coverLetters, setCoverLetters] = useState<CoverLetterItem[]>([])
  const [loading, setLoading] = useState(true)
  const [quota, setQuota] = useState<QuotaData | null>(null)
  const [error, setError] = useState("")

  // Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [cvs, setCvs] = useState<CvItem[]>([])
  const [jobs, setJobs] = useState<JobItem[]>([])

  const [selectedCvId, setSelectedCvId] = useState("")
  const [selectedJobId, setSelectedJobId] = useState("")
  const [selectedLanguage, setSelectedLanguage] = useState<"id" | "en">("id")
  const [selectedTemplate, setSelectedTemplate] = useState<CoverLetterTemplate>("professional")
  const [customInstructions, setCustomInstructions] = useState("")
  const [generating, setGenerating] = useState(false)

  const initialCvId = searchParams.get("cvId")
  const initialJobId = searchParams.get("jobId")

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (initialCvId || initialJobId) {
      openGeneratorModal(initialCvId ?? undefined, initialJobId ?? undefined)
    }
  }, [initialCvId, initialJobId])

  async function fetchData() {
    setLoading(true)
    setError("")
    try {
      const [clRes, quotaRes] = await Promise.all([
        api.get("/api/cover-letters"),
        api.get("/api/cover-letters/quota"),
      ])
      setCoverLetters(clRes.data.coverLetters ?? [])
      setQuota(quotaRes.data)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function openGeneratorModal(preCvId?: string, preJobId?: string) {
    setModalOpen(true)
    try {
      const [cvRes, jobRes] = await Promise.all([api.get("/api/cv"), api.get("/api/jobs")])
      const fetchedCvs = cvRes.data.cvs ?? []
      const fetchedJobs = jobRes.data.jobPostings ?? []
      setCvs(fetchedCvs)
      setJobs(fetchedJobs)

      if (preCvId && fetchedCvs.some((c: CvItem) => c.id === preCvId)) {
        setSelectedCvId(preCvId)
      } else if (fetchedCvs.length > 0) {
        setSelectedCvId(fetchedCvs[0].id)
      }

      if (preJobId && fetchedJobs.some((j: JobItem) => j.id === preJobId)) {
        setSelectedJobId(preJobId)
      } else if (fetchedJobs.length > 0) {
        setSelectedJobId(fetchedJobs[0].id)
      }
    } catch (err) {
      console.error(err)
    }
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedCvId || !selectedJobId) return

    setGenerating(true)
    setError("")
    try {
      const res = await api.post("/api/cover-letters/generate", {
        cvId: selectedCvId,
        jobPostingId: selectedJobId,
        language: selectedLanguage,
        template: selectedTemplate,
        customInstructions: customInstructions.trim() || undefined,
      })
      setModalOpen(false)
      const newCl = res.data.coverLetter
      router.push(`/app/cover-letters/${newCl.id}`)
    } catch (err) {
      setError(errorMessage(err))
      setGenerating(false)
    }
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(lang === "id" ? "Hapus surat lamaran ini?" : "Delete this cover letter?")) return

    try {
      await api.delete(`/api/cover-letters/${id}`)
      setCoverLetters((prev) => prev.filter((item) => item.id !== id))
    } catch (err) {
      alert(errorMessage(err))
    }
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-line pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="hand text-4xl font-bold text-ink">
              {lang === "id" ? "Surat Lamaran" : "Cover Letters"}
            </h1>
            <span className="bg-yellow text-ink border-2 border-line px-3 py-0.5 rounded-full text-xs font-bold shadow-xs">
              AI Powered ✦
            </span>
          </div>
          <p className="text-muted text-sm mt-1">
            {lang === "id"
              ? "Buat surat lamaran profesional secara otomatis yang disesuaikan dengan CV & deskripsi pekerjaan."
              : "Generate tailored professional cover letters aligned with your CV & job descriptions."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {quota && (
            <div className="bg-paper border-2 border-line rounded-xl px-3.5 py-1.5 shadow-xs text-xs font-bold text-ink">
              {quota.quota === null
                ? "Unlimited ✦"
                : `${quota.used}/${quota.quota} ${lang === "id" ? "gratis bulan ini" : "free this month"}`}
            </div>
          )}

          <button
            onClick={() => openGeneratorModal()}
            className="label bg-yellow hover:bg-yellow/90 text-ink border-2 border-line rounded-xl px-5 py-2.5 font-bold shadow-paper flex items-center gap-2 active:scale-95 transition-transform"
          >
            <FiPlus className="h-5 w-5" />
            <span>{lang === "id" ? "Buat Surat Lamaran" : "Create Cover Letter"}</span>
          </button>
        </div>
      </div>

      {/* Content Section */}
      {loading ? (
        <div className="py-16 text-center text-muted font-bold animate-pulse">
          {lang === "id" ? "Memuat surat lamaran…" : "Loading cover letters…"}
        </div>
      ) : coverLetters.length === 0 ? (
        <div className="polaroid bg-paper border-2 border-line p-12 text-center rounded-2xl shadow-lift max-w-xl mx-auto space-y-4">
          <div className="bg-panel border-2 border-line h-16 w-16 mx-auto rounded-full flex items-center justify-center text-2xl shadow-xs">
            ✉️
          </div>
          <h2 className="hand text-2xl font-bold text-ink">
            {lang === "id" ? "Belum Ada Surat Lamaran" : "No Cover Letters Yet"}
          </h2>
          <p className="text-muted text-sm max-w-md mx-auto">
            {lang === "id"
              ? "Tingkatkan peluang dipanggil interview dengan surat lamaran personal yang dibuat oleh AI berdasarkan match score CV Anda."
              : "Increase your interview callback rate with personalized AI cover letters tailored to your CV match score."}
          </p>
          <button
            onClick={() => openGeneratorModal()}
            className="label bg-ink text-paper hover:bg-ink/90 border-2 border-line rounded-xl px-6 py-3 font-bold shadow-paper inline-flex items-center gap-2"
          >
            {/* <FiSparkles className="h-4 w-4 text-yellow" /> */}
            <span>{lang === "id" ? "Buat Surat Lamaran Pertama" : "Create First Cover Letter"}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coverLetters.map((cl, idx) => {
            const jobTitle = cl.jobPosting?.parsedJson?.title || "Posisi Pekerjaan"
            const company = cl.jobPosting?.parsedJson?.company || "Perusahaan"
            const cvTitle = cl.cv?.title || "CV"

            return (
              <Link
                key={cl.id}
                href={`/app/cover-letters/${cl.id}`}
                className="group relative polaroid bg-paper border-2 border-line p-5 rounded-2xl shadow-paper hover:-translate-y-1 transition-all flex flex-col justify-between"
                style={{ transform: `rotate(${(idx % 3 === 0 ? -1 : idx % 2 === 0 ? 1 : 0) * 0.8}deg)` }}
              >
                {/* Tape Accent */}
                <div className="tape-top absolute -top-3 left-1/2 -translate-x-1/2 w-20 h-5 bg-yellow/40 border border-line/30 rotate-2 pointer-events-none" />

                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="uppercase text-[10px] font-bold bg-panel border border-line px-2 py-0.5 rounded-md text-ink">
                      {cl.template ?? "professional"} • {cl.language.toUpperCase()}
                    </span>

                    {cl.relevanceScore !== null && (
                      <span className="text-xs font-bold text-green-700 bg-green-100 border border-green-300 px-2 py-0.5 rounded-md">
                        {cl.relevanceScore}% Match
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-ink text-lg line-clamp-1 group-hover:text-yellow-600 transition-colors">
                    {jobTitle}
                  </h3>
                  <p className="text-xs font-bold text-muted line-clamp-1 mb-3">{company}</p>

                  <div className="bg-panel border border-line p-3 rounded-xl text-xs text-ink/80 italic line-clamp-3 mb-4 font-mono">
                    "{cl.text.slice(0, 150)}…"
                  </div>
                </div>

                <div className="pt-3 border-t border-line/60 flex items-center justify-between text-xs text-muted font-bold">
                  <span className="flex items-center gap-1">
                    <FiClock className="h-3.5 w-3.5" />
                    {new Date(cl.createdAt).toLocaleDateString(lang === "id" ? "id-ID" : "en-US")}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleDelete(cl.id, e)}
                      className="p-1.5 hover:bg-red/20 text-muted hover:text-red rounded-lg transition-colors"
                      title="Hapus"
                    >
                      <FiTrash2 className="h-4 w-4" />
                    </button>
                    <FiArrowRight className="h-4 w-4 text-ink group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Generator Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !generating && setModalOpen(false)}
              className="fixed inset-0 bg-ink/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-paper border-2 border-line p-6 md:p-8 rounded-2xl shadow-lift z-10 space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b-2 border-line pb-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">✍️</span>
                  <h2 className="hand text-2xl font-bold text-ink">
                    {lang === "id" ? "Buat Surat Lamaran" : "Create Cover Letter"}
                  </h2>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  disabled={generating}
                  className="p-2 border-2 border-line bg-panel rounded-xl text-muted hover:text-ink transition-colors shadow-xs"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>

              {error && (
                <div className="bg-red-100 border-2 border-red-300 text-red-800 p-3.5 rounded-xl text-sm font-bold">
                  {error}
                </div>
              )}

              <form onSubmit={handleGenerate} className="space-y-4">
                {/* Select CV */}
                <div>
                  <label className="block text-xs font-bold uppercase text-muted mb-1.5">
                    1. {lang === "id" ? "Pilih CV Pengamar" : "Select Candidate CV"}
                  </label>
                  {cvs.length === 0 ? (
                    <div className="text-xs text-red font-bold">
                      {lang === "id" ? "Belum ada CV terdaftar." : "No CVs available."}{" "}
                      <Link href="/app/cv" className="underline">
                        Tambah CV
                      </Link>
                    </div>
                  ) : (
                    <select
                      value={selectedCvId}
                      onChange={(e) => setSelectedCvId(e.target.value)}
                      required
                      className="w-full bg-panel border-2 border-line rounded-xl px-4 py-2.5 text-sm font-bold text-ink focus:outline-none focus:border-ink"
                    >
                      {cvs.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Select Job */}
                <div>
                  <label className="block text-xs font-bold uppercase text-muted mb-1.5">
                    2. {lang === "id" ? "Pilih Lowongan Pekerjaan" : "Select Job Posting"}
                  </label>
                  {jobs.length === 0 ? (
                    <div className="text-xs text-red font-bold">
                      {lang === "id" ? "Belum ada lowongan terdaftar." : "No job postings available."}{" "}
                      <Link href="/app/jobs" className="underline">
                        Tambah Lowongan
                      </Link>
                    </div>
                  ) : (
                    <select
                      value={selectedJobId}
                      onChange={(e) => setSelectedJobId(e.target.value)}
                      required
                      className="w-full bg-panel border-2 border-line rounded-xl px-4 py-2.5 text-sm font-bold text-ink focus:outline-none focus:border-ink"
                    >
                      {jobs.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.parsedJson?.title || "Lowongan"} {j.parsedJson?.company ? `(${j.parsedJson.company})` : ""}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Language & Template */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-muted mb-1.5">
                      3. {lang === "id" ? "Bahasa Surat" : "Language"}
                    </label>
                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value as "id" | "en")}
                      className="w-full bg-panel border-2 border-line rounded-xl px-4 py-2.5 text-sm font-bold text-ink focus:outline-none focus:border-ink"
                    >
                      <option value="id">Bahasa Indonesia</option>
                      <option value="en">English</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-muted mb-1.5">
                      4. {lang === "id" ? "Gaya Template" : "Template Style"}
                    </label>
                    <select
                      value={selectedTemplate}
                      onChange={(e) => setSelectedTemplate(e.target.value as CoverLetterTemplate)}
                      className="w-full bg-panel border-2 border-line rounded-xl px-4 py-2.5 text-sm font-bold text-ink focus:outline-none focus:border-ink"
                    >
                      {Object.entries(COVER_LETTER_TEMPLATE_LABELS).map(([key, labelObj]) => (
                        <option key={key} value={key}>
                          {lang === "id" ? labelObj.id : labelObj.en}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Custom Instructions */}
                <div>
                  <label className="block text-xs font-bold uppercase text-muted mb-1.5">
                    5. {lang === "id" ? "Instruksi Khusus (Opsional)" : "Custom Instructions (Optional)"}
                  </label>
                  <textarea
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    placeholder={
                      lang === "id"
                        ? "Misal: Tekankan pengalaman memimpin tim, sebutkan ketertarikan pada budaya startup..."
                        : "E.g., Emphasize team leadership experience, mention passion for AI..."
                    }
                    rows={3}
                    className="w-full bg-panel border-2 border-line rounded-xl px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-ink"
                  />
                </div>

                <div className="pt-4 border-t border-line flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    disabled={generating}
                    className="label px-5 py-2.5 border-2 border-line rounded-xl font-bold text-muted hover:text-ink bg-panel"
                  >
                    {lang === "id" ? "Batal" : "Cancel"}
                  </button>

                  <button
                    type="submit"
                    disabled={generating || !selectedCvId || !selectedJobId}
                    className="label bg-yellow hover:bg-yellow/90 text-ink border-2 border-line rounded-xl px-6 py-2.5 font-bold shadow-paper flex items-center gap-2 disabled:opacity-50"
                  >
                    {generating ? (
                      <>
                        <span className="animate-spin">⏳</span>
                        <span>{lang === "id" ? "Membuat AI..." : "Generating AI..."}</span>
                      </>
                    ) : (
                      <>
                        <FiSparkles className="h-4 w-4" />
                        <span>{lang === "id" ? "Generate Surat" : "Generate Cover Letter"}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
