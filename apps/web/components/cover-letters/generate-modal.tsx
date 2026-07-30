"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { FiCheck, FiFileText, FiPlus, FiStar, FiZap } from "react-icons/fi"
import {
  COVER_LETTER_TEMPLATE_LABELS,
  type CoverLetterDto,
  type CoverLetterTemplate,
} from "@dilirik/shared"
import { api, errorMessage } from "@/lib/api"
import { track } from "@/lib/analytics/track"
import { Button } from "@/components/ui/button"
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
import { cn } from "@/lib/utils"

type CvListItem = { id: string; title: string; version: number }
type JobListItem = { id: string; parsedJson: { jobTitle?: string; company?: string }; createdAt: string }

const QUICK_INSTRUCTION_SUGGESTIONS = {
  id: [
    "Tekankan pengalaman memimpin tim",
    "Soroti keahlian problem solving & adaptabilitas",
    "Sebutkan ketertarikan pada budaya inovatif perusahaan",
    "Tekankan pencapaian kuantitatif di proyek sebelumnya",
  ],
  en: [
    "Emphasize team leadership & project ownership",
    "Highlight problem-solving skills & adaptability",
    "Mention enthusiasm for company's product vision",
    "Focus on quantitative impact & key metrics",
  ],
} as const

export function GenerateCoverLetterModal({
  open,
  onOpenChange,
  initialCvId,
  initialJobId,
  lang,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialCvId?: string | null
  initialJobId?: string | null
  lang: "id" | "en"
}) {
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [selectedCvId, setSelectedCvId] = useState("")
  const [selectedJobId, setSelectedJobId] = useState("")
  const [selectedLanguage, setSelectedLanguage] = useState<"id" | "en">(lang)
  const [selectedTemplate, setSelectedTemplate] = useState<CoverLetterTemplate>("professional")
  const [customInstructions, setCustomInstructions] = useState("")

  // Query candidate CVs (enabled when modal is open)
  const cvsQuery = useQuery({
    queryKey: ["cvs"],
    enabled: open,
    queryFn: async () => {
      const res = await api.get<{ cvs: CvListItem[] }>("/api/cv")
      return res.data.cvs
    },
  })

  // Query job postings (enabled when modal is open)
  const jobsQuery = useQuery({
    queryKey: ["jobs"],
    enabled: open,
    queryFn: async () => {
      const res = await api.get<{ jobs: JobListItem[] }>("/api/jobs")
      return res.data.jobs
    },
  })

  // Auto sync initial query parameters
  useEffect(() => {
    if (cvsQuery.data && cvsQuery.data.length > 0) {
      if (initialCvId) {
        const match = cvsQuery.data.find((c) => c.id === initialCvId)
        if (match) setSelectedCvId(match.id)
        else if (!selectedCvId) setSelectedCvId(cvsQuery.data[0]!.id)
      } else if (!selectedCvId) {
        setSelectedCvId(cvsQuery.data[0]!.id)
      }
    }
  }, [cvsQuery.data, initialCvId, selectedCvId])

  useEffect(() => {
    if (jobsQuery.data && jobsQuery.data.length > 0) {
      if (initialJobId) {
        const match = jobsQuery.data.find((j) => j.id === initialJobId)
        if (match) setSelectedJobId(match.id)
        else if (!selectedJobId) setSelectedJobId(jobsQuery.data[0]!.id)
      } else if (!selectedJobId) {
        setSelectedJobId(jobsQuery.data[0]!.id)
      }
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
      track("cover_letter_generated", {
        language: selectedLanguage,
        tone: selectedTemplate,
        length: customInstructions.trim() ? "customized" : "standard",
      })
      queryClient.invalidateQueries({ queryKey: ["cover-letters"] })
      queryClient.invalidateQueries({ queryKey: ["cover-letter-quota"] })
      onOpenChange(false)
      toast(
        lang === "id" ? "Surat lamaran berhasil dibuat! ✨" : "Cover letter generated successfully! ✨",
        "success"
      )
      router.push(`/app/cover-letters/${newCoverLetter.id}`)
    },
    onError: (err) => {
      toast(errorMessage(err), "error")
    },
  })

  const cvs = cvsQuery.data ?? []
  const jobs = jobsQuery.data ?? []

  function addQuickInstruction(suggestion: string) {
    if (customInstructions.includes(suggestion)) return
    setCustomInstructions((prev) =>
      prev ? `${prev.trim()}; ${suggestion}` : suggestion
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col p-6 gap-0 overflow-hidden">
        <DialogHeader className="pb-4 border-b-2 border-line shrink-0">
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <span className="p-2 bg-yellow/30 border border-yellow/60 rounded-xl text-xl">✍️</span>
            <div className="flex flex-col">
              <span className="hand text-2xl leading-none">
                {lang === "id" ? "Buat Surat Lamaran AI" : "Create AI Cover Letter"}
              </span>
              <span className="scrawl text-muted text-xs font-normal mt-0.5">
                {lang === "id"
                  ? "Disesuaikan otomatis dengan latar belakang CV & kualifikasi lowongan"
                  : "Tailored automatically based on candidate CV & job requirements"}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        {generateMutation.isError && (
          <div className="mt-4 bg-red-100 border-2 border-red-300 text-red-800 p-3.5 rounded-xl text-xs font-bold shrink-0">
            ⚠️ {errorMessage(generateMutation.error)}
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
          <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1 max-h-[58vh] custom-scrollbar">
            {/* Step 1 & 2: Select CV & Job */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Select CV */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted">
                  1. {lang === "id" ? "Pilih CV Pengelamar" : "Select Candidate CV"}
                </label>
                {cvsQuery.isLoading ? (
                  <div className="h-10 bg-line/20 rounded-xl animate-pulse" />
                ) : cvs.length === 0 ? (
                  <div className="text-xs text-red font-bold p-3 bg-red/10 border border-red/30 rounded-xl flex items-center justify-between">
                    <span>{lang === "id" ? "Belum ada CV." : "No CVs found."}</span>
                    <Link href="/app/cv" className="underline hover:text-ink">
                      + {lang === "id" ? "Tambah" : "Add"}
                    </Link>
                  </div>
                ) : (
                  <Select value={selectedCvId} onValueChange={setSelectedCvId}>
                    <SelectTrigger className="w-full bg-paper border-2 border-line text-xs font-semibold rounded-xl focus:border-ink">
                      <SelectValue placeholder={lang === "id" ? "— pilih CV —" : "— select CV —"} />
                    </SelectTrigger>
                    <SelectContent>
                      {cvs.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          📄 {c.title} (v{c.version})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Select Job */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted">
                  2. {lang === "id" ? "Pilih Lowongan Pekerjaan" : "Select Job Posting"}
                </label>
                {jobsQuery.isLoading ? (
                  <div className="h-10 bg-line/20 rounded-xl animate-pulse" />
                ) : jobs.length === 0 ? (
                  <div className="text-xs text-red font-bold p-3 bg-red/10 border border-red/30 rounded-xl flex items-center justify-between">
                    <span>{lang === "id" ? "Belum ada lowongan." : "No jobs found."}</span>
                    <Link href="/app/jobs" className="underline hover:text-ink">
                      + {lang === "id" ? "Tambah" : "Add"}
                    </Link>
                  </div>
                ) : (
                  <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                    <SelectTrigger className="w-full bg-paper border-2 border-line text-xs font-semibold rounded-xl focus:border-ink">
                      <SelectValue placeholder={lang === "id" ? "— pilih Lowongan —" : "— select Job —"} />
                    </SelectTrigger>
                    <SelectContent>
                      {jobs.map((j) => (
                        <SelectItem key={j.id} value={j.id}>
                          💼 {j.parsedJson?.jobTitle || "Lowongan"} {j.parsedJson?.company ? `(${j.parsedJson.company})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Language Selection */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted">
                3. {lang === "id" ? "Bahasa Surat" : "Language"}
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    ["id", "🇮🇩 Bahasa Indonesia"],
                    ["en", "🇬🇧 English"],
                  ] as const
                ).map(([code, label]) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setSelectedLanguage(code)}
                    className={cn(
                      "p-2.5 rounded-xl border-2 text-xs font-bold transition-all flex items-center justify-between cursor-pointer",
                      selectedLanguage === code
                        ? "border-ink bg-panel shadow-xs text-ink"
                        : "border-line bg-paper text-muted hover:border-line/80"
                    )}
                  >
                    <span>{label}</span>
                    {selectedLanguage === code && <FiCheck className="h-4 w-4 text-green" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Template Selection Cards */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted">
                4. {lang === "id" ? "Pilih Gaya Template" : "Select Template Style"}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(["professional", "modern", "creative"] as const).map((key) => {
                  const labelObj = COVER_LETTER_TEMPLATE_LABELS[key]
                  const title = lang === "id" ? labelObj.id : labelObj.en
                  const desc = lang === "id" ? labelObj.description.id : labelObj.description.en
                  const isSelected = selectedTemplate === key

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedTemplate(key)}
                      className={cn(
                        "p-3 rounded-2xl border-2 text-left transition-all flex flex-col justify-between cursor-pointer space-y-2 relative overflow-hidden",
                        isSelected
                          ? "border-ink bg-yellow/15 shadow-paper ring-2 ring-yellow/40"
                          : "border-line bg-paper hover:border-ink/60"
                      )}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-ink text-xs uppercase label">{title}</span>
                          {isSelected && <FiCheck className="h-4 w-4 text-ink shrink-0" />}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Custom Instructions (Optional) */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase text-muted">
                <span>5. {lang === "id" ? "Instruksi Khusus (Opsional)" : "Custom Instructions (Optional)"}</span>
                <span className={cn("text-[10px]", customInstructions.length > 900 ? "text-red" : "text-muted")}>
                  {customInstructions.length}/1000
                </span>
              </div>
              <textarea
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                maxLength={1000}
                placeholder={
                  lang === "id"
                    ? "Contoh: Tekankan pengalaman memimpin tim, sebutkan minat pada proyek AI perusahaan..."
                    : "Example: Emphasize team leadership experience, mention interest in company's AI products..."
                }
                rows={3}
                className="w-full bg-paper border-2 border-line rounded-xl p-3 text-xs text-ink font-mono focus:outline-none focus:border-ink shadow-inner leading-relaxed"
              />

              {/* Quick Instruction Suggestion Chips */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted uppercase flex items-center gap-1">
                  <FiStar className="h-3 w-3 text-yellow" />
                  {lang === "id" ? "Saran cepat:" : "Quick suggestions:"}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_INSTRUCTION_SUGGESTIONS[selectedLanguage].map((suggestion, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => addQuickInstruction(suggestion)}
                      className="text-[10px] font-semibold bg-panel border border-line hover:border-ink hover:bg-yellow/20 px-2 py-0.5 rounded-lg text-muted hover:text-ink transition-colors cursor-pointer"
                    >
                      + {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Footer Buttons */}
          <div className="pt-4 border-t-2 border-line flex items-center justify-end gap-3 shrink-0">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={generateMutation.isPending}
            >
              {lang === "id" ? "Batal" : "Cancel"}
            </Button>

            <Button
              type="submit"
              variant="yellow"
              isLoading={generateMutation.isPending}
              disabled={!selectedCvId || !selectedJobId || generateMutation.isPending}
              icon={<FiZap />}
            >
              {generateMutation.isPending
                ? lang === "id"
                  ? "Menyarikan Teks AI…"
                  : "Generating AI…"
                : lang === "id"
                  ? "Generate Surat Lamaran"
                  : "Generate Cover Letter"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
