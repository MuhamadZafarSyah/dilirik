"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import {
  FiPlus,
  FiSearch,
  FiZap,
  FiFilter,
  FiX,
  FiFileText,
} from "react-icons/fi"
import { api, errorMessage, type QuotaInfo } from "@/lib/api"
import { useI18n } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useToast } from "@/components/ui/toast"
import { CoverLetterCard } from "@/components/cover-letters/cover-letter-card"
import { GenerateCoverLetterModal } from "@/components/cover-letters/generate-modal"
import {
  type CoverLetterDto,
  type CoverLetterTemplate,
} from "@dilirik/shared"
import { cn } from "@/lib/utils"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.02 },
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

function CoverLettersContent() {
  const searchParams = useSearchParams()
  const { lang } = useI18n()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Modal & Dialog state
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTemplateFilter, setSelectedTemplateFilter] = useState<string>("all")
  const [selectedLangFilter, setSelectedLangFilter] = useState<string>("all")

  const initialCvId = searchParams.get("cvId")
  const initialJobId = searchParams.get("jobId")

  // Auto-open modal if query params present (e.g. redirected from CV or Job page)
  useEffect(() => {
    if (initialCvId || initialJobId) {
      setModalOpen(true)
    }
  }, [initialCvId, initialJobId])

  // Query: Cover Letters List
  const listQuery = useQuery({
    queryKey: ["cover-letters"],
    queryFn: async () => {
      const res = await api.get<{ coverLetters: CoverLetterDto[] }>("/api/cover-letters")
      return res.data.coverLetters
    },
  })

  // Query: Quota Info
  const quotaQuery = useQuery({
    queryKey: ["cover-letter-quota"],
    queryFn: async () => {
      const res = await api.get<QuotaInfo>("/api/cover-letters/quota")
      return res.data
    },
  })

  // Mutation: Delete Cover Letter
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/cover-letters/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cover-letters"] })
      toast(
        lang === "id" ? "Surat lamaran berhasil dihapus" : "Cover letter deleted successfully",
        "success"
      )
      setDeleteTargetId(null)
    },
    onError: (err) => {
      toast(errorMessage(err), "error")
    },
  })

  const rawCoverLetters = listQuery.data ?? []
  const quota = quotaQuery.data

  // Filtered Cover Letters
  const filteredCoverLetters = useMemo(() => {
    return rawCoverLetters.filter((cl) => {
      // Template filter
      if (selectedTemplateFilter !== "all" && cl.template !== selectedTemplateFilter) {
        return false
      }
      // Language filter
      if (selectedLangFilter !== "all" && cl.language !== selectedLangFilter) {
        return false
      }
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const title = (cl.jobPosting?.title || "").toLowerCase()
        const company = (cl.jobPosting?.company || "").toLowerCase()
        const text = cl.text.toLowerCase()
        return title.includes(q) || company.includes(q) || text.includes(q)
      }
      return true
    })
  }, [rawCoverLetters, selectedTemplateFilter, selectedLangFilter, searchQuery])

  const isFilterActive = searchQuery.trim() !== "" || selectedTemplateFilter !== "all" || selectedLangFilter !== "all"

  function handleDeleteClick(id: string, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDeleteTargetId(id)
  }

  function resetFilters() {
    setSearchQuery("")
    setSelectedTemplateFilter("all")
    setSelectedLangFilter("all")
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-6xl mx-auto space-y-8 p-4 md:p-6"
    >
      {/* Header Section */}
      <motion.header
        variants={itemVariants}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-line pb-6"
      >
        <div>
          <div className="flex items-center gap-3">
            <h1 className="hand text-4xl font-bold text-ink">
              {lang === "id" ? "Surat Lamaran" : "Cover Letters"}
            </h1>
          </div>
          <p className="text-muted text-sm mt-1">
            {lang === "id"
              ? "Buat surat lamaran profesional secara otomatis yang disesuaikan dengan CV & deskripsi pekerjaan."
              : "Generate tailored professional cover letters aligned with your CV & job descriptions."}
          </p>
        </div>

        {/* Quota Badge & Create CTA */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {quota && (
            <div className="bg-paper border-2 border-line rounded-2xl px-4 py-2 shadow-paper text-xs font-bold text-ink flex items-center gap-2">
              <FiZap className="h-4 w-4 text-yellow" />
              <span>
                {quota.quota === null
                  ? "Unlimited ✦"
                  : `${quota.used}/${quota.quota} ${lang === "id" ? "gratis bulan ini" : "free this month"}`}
              </span>
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
      </motion.header>

      {/* Filter & Search Bar */}
      {rawCoverLetters.length > 0 && (
        <motion.div
          variants={itemVariants}
          className="bg-panel border-2 border-line rounded-2xl p-4 shadow-paper space-y-3"
        >
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[220px]">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  lang === "id"
                    ? "Cari posisi, perusahaan, atau isi surat..."
                    : "Search job title, company, or text..."
                }
                className="w-full bg-paper border-2 border-line rounded-xl pl-10 pr-8 py-2 text-xs font-mono text-ink placeholder:text-muted/60 focus:outline-none focus:border-ink shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-line/40 text-muted hover:text-ink transition-colors"
                >
                  <FiX className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Template Filters */}
            <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-[11px] font-bold uppercase text-muted mr-1 flex items-center gap-1">
                <FiFilter className="h-3 w-3" />
                {lang === "id" ? "Gaya:" : "Style:"}
              </span>
              {(
                [
                  ["all", lang === "id" ? "Semua" : "All"],
                  ["professional", lang === "id" ? "Profesional" : "Professional"],
                  ["modern", lang === "id" ? "Modern" : "Modern"],
                  ["creative", lang === "id" ? "Kreatif" : "Creative"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSelectedTemplateFilter(key)}
                  className={cn(
                    "label text-xs font-bold uppercase px-3 py-1 rounded-lg border transition-all cursor-pointer select-none",
                    selectedTemplateFilter === key
                      ? "bg-ink text-paper border-ink shadow-xs"
                      : "bg-paper text-muted border-line hover:border-ink/60 hover:text-ink"
                  )}
                >
                  {label}
                </button>
              ))}

              {isFilterActive && (
                <button
                  onClick={resetFilters}
                  className="text-xs font-bold text-red hover:underline ml-2 flex items-center gap-1 cursor-pointer"
                >
                  <FiX className="h-3.5 w-3.5" />
                  {lang === "id" ? "Reset" : "Reset"}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Main Cover Letters Showcase Grid */}
      {listQuery.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-60 bg-panel/60 border-2 border-line rounded-2xl p-5 shadow-paper" />
          ))}
        </div>
      ) : rawCoverLetters.length === 0 ? (
        <motion.div variants={itemVariants}>
          <EmptyState
            title={lang === "id" ? "Belum ada surat lamaran" : "No cover letters yet"}
            ctaLabel={lang === "id" ? "✍️ Buat Surat Lamaran Pertama" : "✍️ Create First Cover Letter"}
            ctaHref="#"
            onCtaClick={() => setModalOpen(true)}
            note={
              lang === "id"
                ? "Surat lamaran personal yang dibuat AI dapat meningkatkan peluang panggilan interview."
                : "Personalized AI cover letters increase your interview callback rate."
            }
          />
        </motion.div>
      ) : filteredCoverLetters.length === 0 ? (
        <motion.div variants={itemVariants} className="text-center py-12 space-y-3">
          <div className="inline-block bg-panel border-2 border-line p-4 rounded-full shadow-paper text-2xl">
            🔍
          </div>
          <h3 className="hand text-2xl font-bold text-ink">
            {lang === "id" ? "Tidak ada hasil pencarian" : "No matching cover letters"}
          </h3>
          <p className="text-xs text-muted">
            {lang === "id"
              ? "Coba ubah kata kunci pencarian atau reset filter di atas."
              : "Try adjusting your search terms or reset the filters above."}
          </p>
          <Button variant="secondary" size="sm" onClick={resetFilters}>
            {lang === "id" ? "Reset Filter" : "Reset Filters"}
          </Button>
        </motion.div>
      ) : (
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCoverLetters.map((cl, idx) => (
            <CoverLetterCard
              key={cl.id}
              coverLetter={cl}
              index={idx}
              lang={lang}
              onDeleteClick={handleDeleteClick}
              isDeleting={deleteMutation.isPending && deleteTargetId === cl.id}
            />
          ))}
        </motion.div>
      )}

      {/* Generator Modal Component */}
      <GenerateCoverLetterModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        initialCvId={initialCvId}
        initialJobId={initialJobId}
        lang={lang}
      />

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

export default function CoverLettersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center font-hand text-2xl">Memuat…</div>}>
      <CoverLettersContent />
    </Suspense>
  )
}
