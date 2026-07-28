"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import {
  FiPlus,
  FiTrash2,
  FiArrowRight,
  FiZap,
  FiClock,
} from "react-icons/fi"
import { api, errorMessage, type QuotaInfo } from "@/lib/api"
import { useI18n } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { Polaroid } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useToast } from "@/components/ui/toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/modal"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  COVER_LETTER_TEMPLATE_LABELS,
  type CoverLetterDto,
  type CoverLetterTemplate,
} from "@dilirik/shared"

type CvListItem = { id: string; title: string; version: number }
type JobListItem = { id: string; parsedJson: { jobTitle?: string; company?: string }; createdAt: string }

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.02 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 350, damping: 25 },
  },
}

export default function CoverLettersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { lang } = useI18n()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [modalOpen, setModalOpen] = useState(false)
  const [selectedCvId, setSelectedCvId] = useState("")
  const [selectedJobId, setSelectedJobId] = useState("")
  const [selectedLanguage, setSelectedLanguage] = useState<"id" | "en">("id")
  const [selectedTemplate, setSelectedTemplate] = useState<CoverLetterTemplate>("professional")
  const [customInstructions, setCustomInstructions] = useState("")
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const initialCvId = searchParams.get("cvId")
  const initialJobId = searchParams.get("jobId")

  // Query: Cover Letters List
  const listQuery = useQuery({
    queryKey: ["cover-letters"],
    queryFn: async () => {
      const res = await api.get<{ coverLetters: CoverLetterDto[] }>("/api/cover-letters")
      return res.data.coverLetters
    },
  })

  // Query: Quota
  const quotaQuery = useQuery({
    queryKey: ["cover-letter-quota"],
    queryFn: async () => {
      const res = await api.get<QuotaInfo>("/api/cover-letters/quota")
      return res.data
    },
  })

  // Query: Candidate CVs (enabled when modal opens or initial query params exist)
  const cvsQuery = useQuery({
    queryKey: ["cvs"],
    enabled: modalOpen || Boolean(initialCvId || initialJobId),
    queryFn: async () => {
      const res = await api.get<{ cvs: CvListItem[] }>("/api/cv")
      return res.data.cvs
    },
  })

  // Query: Job Postings (enabled when modal opens or initial query params exist)
  const jobsQuery = useQuery({
    queryKey: ["jobs"],
    enabled: modalOpen || Boolean(initialCvId || initialJobId),
    queryFn: async () => {
      const res = await api.get<{ jobs: JobListItem[] }>("/api/jobs")
      return res.data.jobs
    },
  })

  // Auto-open modal if query params present
  useEffect(() => {
    if (initialCvId || initialJobId) {
      setModalOpen(true)
    }
  }, [initialCvId, initialJobId])

  // Sync selected CV and Job when options load
  useEffect(() => {
    if (cvsQuery.data && cvsQuery.data.length > 0 && !selectedCvId) {
      const match = initialCvId && cvsQuery.data.find((c) => c.id === initialCvId)
      setSelectedCvId(match ? match.id : (cvsQuery.data[0]?.id || ""))
    }
  }, [cvsQuery.data, initialCvId, selectedCvId])

  useEffect(() => {
    if (jobsQuery.data && jobsQuery.data.length > 0 && !selectedJobId) {
      const match = initialJobId && jobsQuery.data.find((j) => j.id === initialJobId)
      setSelectedJobId(match ? match.id : (jobsQuery.data[0]?.id || ""))
    }
  }, [jobsQuery.data, initialJobId, selectedJobId])

  // Mutation: Generate Cover Letter
  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ coverLetter: CoverLetterDto }>("/api/cover-letters/generate", {
        cvId: selectedCvId,
        jobPostingId: selectedJobId,
        language: selectedLanguage,
        template: selectedTemplate,
        customInstructions: customInstructions.trim() || undefined,
      })
      return res.data.coverLetter
    },
    onSuccess: (newCoverLetter) => {
      queryClient.invalidateQueries({ queryKey: ["cover-letters"] })
      queryClient.invalidateQueries({ queryKey: ["cover-letter-quota"] })
      setModalOpen(false)
      toast(lang === "id" ? "Surat lamaran berhasil dibuat!" : "Cover letter generated successfully!", "success")
      router.push(`/app/cover-letters/${newCoverLetter.id}`)
    },
    onError: (err) => {
      toast(errorMessage(err), "error")
    },
  })

  // Mutation: Delete Cover Letter
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/cover-letters/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cover-letters"] })
      toast(lang === "id" ? "Surat lamaran berhasil dihapus" : "Cover letter deleted successfully", "success")
      setDeleteTargetId(null)
    },
    onError: (err) => {
      toast(errorMessage(err), "error")
    },
  })

  function handleDeleteClick(id: string, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDeleteTargetId(id)
  }

  const coverLetters = listQuery.data ?? []
  const quota = quotaQuery.data
  const cvs = cvsQuery.data ?? []
  const jobs = jobsQuery.data ?? []

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-6xl mx-auto space-y-8 p-4 md:p-6"
    >
      {/* Header */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-line pb-6"
      >
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

          <Button
            variant="yellow"
            size="md"
            icon={<FiPlus />}
            onClick={() => setModalOpen(true)}
          >
            {lang === "id" ? "Buat Surat Lamaran" : "Create Cover Letter"}
          </Button>
        </div>
      </motion.div>

      {/* Main Content Showcase */}
      {listQuery.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 bg-panel/60 border-2 border-line rounded-2xl p-5 shadow-paper" />
          ))}
        </div>
      ) : coverLetters.length === 0 ? (
        <motion.div variants={itemVariants}>
          <EmptyState
            title={lang === "id" ? "Belum ada surat lamaran" : "No cover letters yet"}
            ctaLabel={lang === "id" ? "✍️ Buat Surat Lamaran Pertama" : "✍️ Create First Cover Letter"}
            ctaHref="#"
            note={
              lang === "id"
                ? "Surat lamaran personal yang dibuat AI dapat meningkatkan peluang panggilan interview."
                : "Personalized AI cover letters increase your interview callback rate."
            }
          />
        </motion.div>
      ) : (
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coverLetters.map((cl, idx) => {
            const jobTitle = cl.jobPosting?.title || "Posisi Pekerjaan"
            const company = cl.jobPosting?.company || "Perusahaan"

            return (
              <Link key={cl.id} href={`/app/cover-letters/${cl.id}`} className="block group">
                <Polaroid
                  rotate={(idx % 3 === 0 ? -1 : idx % 2 === 0 ? 1 : 0) * 0.8}
                  tape={idx % 3 === 0 ? "yellow" : idx % 3 === 1 ? "blue" : "red"}
                  className="h-full flex flex-col justify-between p-5 space-y-4 group-hover:border-ink transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="uppercase text-[10px] font-bold bg-panel border border-line px-2 py-0.5 rounded-md text-ink">
                        {cl.template ?? "professional"} • {cl.language.toUpperCase()}
                      </span>

                      {cl.relevanceScore !== null && (
                        <span className="text-xs font-bold text-green-700 bg-green-100 border border-green-300 px-2 py-0.5 rounded-md">
                          {cl.relevanceScore}% Match
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="font-bold text-ink text-lg line-clamp-1 group-hover:text-yellow-600 transition-colors">
                        {jobTitle}
                      </h3>
                      <p className="text-xs font-bold text-muted line-clamp-1">{company}</p>
                    </div>

                    <div className="bg-panel/70 border border-line p-3 rounded-xl text-xs text-ink/80 italic line-clamp-3 font-mono">
                      "{cl.text.slice(0, 140)}…"
                    </div>
                  </div>

                  <div className="pt-3 border-t border-line/60 flex items-center justify-between text-xs text-muted font-bold">
                    <span className="flex items-center gap-1">
                      <FiClock className="h-3.5 w-3.5" />
                      {new Date(cl.createdAt).toLocaleDateString(lang === "id" ? "id-ID" : "en-US")}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleDeleteClick(cl.id, e)}
                        disabled={deleteMutation.isPending}
                        className="p-1.5 hover:bg-red/20 text-muted hover:text-red rounded-lg transition-colors"
                        title="Hapus"
                      >
                        <FiTrash2 className="h-4 w-4" />
                      </button>
                      <FiArrowRight className="h-4 w-4 text-ink group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Polaroid>
              </Link>
            )
          })}
        </motion.div>
      )}

      {/* Generator Radix Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] flex flex-col p-6 gap-0">
          <DialogHeader className="pb-4 border-b-2 border-line shrink-0">
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <span>✍️</span>
              <span>{lang === "id" ? "Buat Surat Lamaran AI" : "Create AI Cover Letter"}</span>
            </DialogTitle>
          </DialogHeader>

          {generateMutation.isError && (
            <div className="mt-4 bg-red-100 border-2 border-red-300 text-red-800 p-3.5 rounded-xl text-sm font-bold shrink-0">
              {errorMessage(generateMutation.error)}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (selectedCvId && selectedJobId) {
                generateMutation.mutate()
              }
            }}
            className="flex flex-col flex-1 min-h-0"
          >
            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 max-h-[55vh]">
              {/* Select CV */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase text-muted">
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
                  <Select value={selectedCvId} onValueChange={setSelectedCvId}>
                    <SelectTrigger className="w-full bg-paper border-2 border-line text-sm font-semibold rounded-xl focus:border-ink">
                      <SelectValue placeholder={lang === "id" ? "— pilih CV —" : "— select CV —"} />
                    </SelectTrigger>
                    <SelectContent>
                      {cvs.map((cv) => (
                        <SelectItem key={cv.id} value={cv.id}>
                          {cv.title} (v{cv.version})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Select Job */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase text-muted">
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
                  <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                    <SelectTrigger className="w-full bg-paper border-2 border-line text-sm font-semibold rounded-xl focus:border-ink">
                      <SelectValue placeholder={lang === "id" ? "— pilih Lowongan —" : "— select Job —"} />
                    </SelectTrigger>
                    <SelectContent>
                      {jobs.map((j) => (
                        <SelectItem key={j.id} value={j.id}>
                          {j.parsedJson?.jobTitle || "Lowongan"} {j.parsedJson?.company ? `(${j.parsedJson.company})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Language & Template */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase text-muted">
                    3. {lang === "id" ? "Bahasa Surat" : "Language"}
                  </label>
                  <Select value={selectedLanguage} onValueChange={(val) => setSelectedLanguage(val as "id" | "en")}>
                    <SelectTrigger className="w-full bg-paper border-2 border-line text-sm font-semibold rounded-xl focus:border-ink">
                      <SelectValue placeholder={lang === "id" ? "— pilih Bahasa —" : "— select Language —"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="id">Bahasa Indonesia</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase text-muted">
                    4. {lang === "id" ? "Gaya Template" : "Template Style"}
                  </label>
                  <Select value={selectedTemplate} onValueChange={(val) => setSelectedTemplate(val as CoverLetterTemplate)}>
                    <SelectTrigger className="w-full bg-paper border-2 border-line text-sm font-semibold rounded-xl focus:border-ink">
                      <SelectValue placeholder={lang === "id" ? "— pilih Template —" : "— select Template —"} />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(COVER_LETTER_TEMPLATE_LABELS).map(([key, labelObj]) => (
                        <SelectItem key={key} value={key}>
                          {lang === "id" ? labelObj.id : labelObj.en}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Custom Instructions */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase text-muted">
                  5. {lang === "id" ? "Instruksi Khusus (Opsional)" : "Custom Instructions (Optional)"}
                </label>
                <textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder={
                    lang === "id"
                      ? "Tekankan pengalaman memimpin tim, sebutkan ketertarikan pada budaya startup..."
                      : "Emphasize team leadership experience, mention passion for AI..."
                  }
                  rows={3}
                  className="w-full bg-panel border-2 border-line rounded-xl px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-ink"
                />
              </div>
            </div>

            {/* Sticky Footer Buttons */}
            <div className="pt-4 border-t-2 border-line flex items-center justify-end gap-3 shrink-0">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setModalOpen(false)}
                disabled={generateMutation.isPending}
              >
                {lang === "id" ? "Batal" : "Cancel"}
              </Button>

              <Button
                type="submit"
                variant="yellow"
                isLoading={generateMutation.isPending}
                disabled={!selectedCvId || !selectedJobId}
                icon={<FiZap />}
              >
                {lang === "id" ? "Generate Surat" : "Generate Cover Letter"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={deleteTargetId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetId(null)
        }}
        title={lang === "id" ? "Hapus Surat Lamaran?" : "Delete Cover Letter?"}
        description={
          lang === "id"
            ? "Surat lamaran ini akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan."
            : "This cover letter will be permanently deleted. This action cannot be undone."
        }
        confirmLabel={lang === "id" ? "Ya, Hapus" : "Yes, Delete"}
        cancelLabel={lang === "id" ? "Batal" : "Cancel"}
        onConfirm={async () => {
          if (deleteTargetId) {
            await deleteMutation.mutateAsync(deleteTargetId)
          }
        }}
      />
    </motion.div>
  )
}
