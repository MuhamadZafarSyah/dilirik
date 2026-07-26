"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import {
  FiArrowLeft,
  FiMic,
  FiFileText,
  FiBriefcase,
  FiCheckCircle,
  FiZap,
  FiAward,
  FiTarget,
  FiCpu,
} from "react-icons/fi"
import { INTERVIEW_PERSONAS, INTERVIEW_PERSONA_LABELS, type InterviewPersona } from "@dilirik/shared"
import { api, errorMessage } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, Sticky } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"

type CvItem = { id: string; title: string; version: number; language: string }
type JobItem = { id: string; parsedJson: { jobTitle?: string; company?: string } | null; rawText: string }

const DIFFICULTY_MAP: Record<InterviewPersona, { level: string; color: string; badge: string }> = {
  SANTAI: { level: "⭐ Level 1 — Suportif", color: "border-green/60 bg-green/10 text-green", badge: "EASY" },
  NETRAL: { level: "⭐⭐ Level 2 — Standar HR", color: "border-blue/60 bg-blue/10 text-blue", badge: "MEDIUM" },
  TEGAS: { level: "⭐⭐⭐ Level 3 — Tech Lead", color: "border-yellow/60 bg-yellow/20 text-ink", badge: "HARD" },
  MENEKAN: { level: "💥 Level 4 — Boss Challenge", color: "border-red/60 bg-red/15 text-red", badge: "EXPERT" },
}

export default function NewInterviewPage() {
  return (
    <Suspense fallback={<p className="scrawl text-2xl text-center py-20">Memuat Arena Interview…</p>}>
      <NewInterviewForm />
    </Suspense>
  )
}

function NewInterviewForm() {
  const router = useRouter()
  const params = useSearchParams()
  const queryClient = useQueryClient()
  const { lang } = useI18n()

  const prefCvId = params.get("cvId")
  const prefJobId = params.get("jobId")
  const analysisId = params.get("analysisId")

  const [cvId, setCvId] = useState<string | null>(prefCvId)
  const [jobId, setJobId] = useState<string | null>(prefJobId)
  const [persona, setPersona] = useState<InterviewPersona>("NETRAL")
  const [error, setError] = useState<string | null>(null)

  const cvsQuery = useQuery({
    queryKey: ["cvs"],
    queryFn: async () => (await api.get<{ cvs: CvItem[] }>("/api/cv")).data.cvs,
  })
  const jobsQuery = useQuery({
    queryKey: ["jobs"],
    queryFn: async () => (await api.get<{ jobs: JobItem[] }>("/api/jobs")).data.jobs,
  })

  useEffect(() => {
    if (cvId && cvsQuery.data && !cvsQuery.data.some((cv) => cv.id === cvId)) setCvId(null)
  }, [cvId, cvsQuery.data])
  useEffect(() => {
    if (jobId && jobsQuery.data && !jobsQuery.data.some((job) => job.id === jobId)) setJobId(null)
  }, [jobId, jobsQuery.data])

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ session: { id: string } }>("/api/interview/sessions", {
        cvId: cvId ?? undefined,
        jobPostingId: jobId ?? undefined,
        analysisId: analysisId ?? undefined,
        persona,
      })
      return data.session
    },
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ["interviews"] })
      queryClient.invalidateQueries({ queryKey: ["interview-quota"] })
      router.push(`/app/interview/${session.id}/live`)
    },
    onError: (err) => setError(errorMessage(err)),
  })

  const cvs = cvsQuery.data ?? []
  const jobs = jobsQuery.data ?? []

  const isReady = Boolean(cvId)

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-4 md:p-8">
      {/* Header Nav */}
      <div className="flex items-center justify-between">
        <Link href="/app/interview" className="label text-xs font-bold text-muted hover:text-ink flex items-center gap-1">
          <FiArrowLeft /> {lang === "id" ? "Kembali ke Riwayat" : "Back to History"}
        </Link>
        <span className="label bg-yellow/40 border border-yellow/70 text-ink px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
          🎮 Mode Simulasi Suara Live
        </span>
      </div>

      {/* Hero Banner */}
      <div className="text-center space-y-3">
        <h1 className="hand text-4xl sm:text-6xl font-bold text-ink">
          Arena Latihan Interview AI 🎙️
        </h1>
        <p className="scrawl text-muted text-xl max-w-xl mx-auto">
          {lang === "id"
            ? "Pilih Karakter CV, Arena Lowongan, dan Tantang Boss Pewawancara AI!"
            : "Pick your CV Character, Target Job Arena, and Challenge the AI Boss Interviewer!"}
        </p>
      </div>

      {/* Step 1: Character CV Selection */}
      <Card tape="yellow" pin rotate={-0.5} className="space-y-4 p-6 sm:p-8">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <span className="bg-ink text-paper h-7 w-7 rounded-lg flex items-center justify-center font-bold text-sm">
              1
            </span>
            <h2 className="hand text-2xl font-bold text-ink">
              {lang === "id" ? "Pilih Karakter CV Kamu 📄" : "Choose Your CV Character 📄"}
            </h2>
          </div>
          {cvId && <span className="label bg-green/20 text-green px-2.5 py-0.5 rounded-full text-xs font-bold">✓ Terpilih</span>}
        </div>

        {cvsQuery.isLoading ? (
          <p className="scrawl text-muted text-lg">{lang === "id" ? "Memuat koleksi CV…" : "Loading CVs…"}</p>
        ) : cvs.length === 0 ? (
          <EmptyState
            title={lang === "id" ? "Belum ada CV master" : "No master CV found"}
            ctaLabel={lang === "id" ? "+ Tambah Master CV Baru" : "+ Add New Master CV"}
            ctaHref="/app/cv/new"
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {cvs.map((cv) => {
              const selected = cvId === cv.id
              return (
                <motion.button
                  key={cv.id}
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setCvId(cv.id)}
                  className={cn(
                    "relative text-left p-4 rounded-xl border-2 transition-all select-none cursor-pointer",
                    selected
                      ? "border-ink bg-ink text-paper shadow-paper -rotate-1"
                      : "border-line bg-paper/80 hover:border-ink text-ink shadow-xs",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="hand text-xl font-bold truncate">{cv.title}</span>
                    <span className={cn("label px-2 py-0.5 rounded text-[10px] uppercase font-bold", selected ? "bg-yellow text-ink" : "bg-panel text-muted")}>
                      v{cv.version}
                    </span>
                  </div>
                  <p className={cn("text-xs mt-1", selected ? "text-paper/80" : "text-muted")}>
                    Bahasa: {cv.language.toUpperCase()}
                  </p>
                </motion.button>
              )
            })}
          </div>
        )}
      </Card>

      {/* Step 2: Battle Arena (Job Posting) */}
      <Card tape="blue" rotate={0.5} className="space-y-4 p-6 sm:p-8">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <span className="bg-ink text-paper h-7 w-7 rounded-lg flex items-center justify-center font-bold text-sm">
              2
            </span>
            <h2 className="hand text-2xl font-bold text-ink">
              {lang === "id" ? "Target Arena Lowongan 🎯" : "Target Job Arena 🎯"}
            </h2>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {/* General Arena Option */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setJobId(null)}
            className={cn(
              "relative text-left p-4 rounded-xl border-2 transition-all select-none cursor-pointer",
              jobId === null
                ? "border-ink bg-ink text-paper shadow-paper -rotate-1"
                : "border-line bg-paper/80 hover:border-ink text-ink shadow-xs",
            )}
          >
            <span className="hand text-xl font-bold block">
              🌐 {lang === "id" ? "Arena Umum (Pertanyaan HR General)" : "General Arena (HR General Questions)"}
            </span>
            <p className={cn("text-xs mt-1", jobId === null ? "text-paper/80" : "text-muted")}>
              Cocok untuk latihan bebas tanpa fokus ke lowongan tertentu.
            </p>
          </motion.button>

          {/* Specific Jobs */}
          {jobs.map((job) => {
            const selected = jobId === job.id
            const title = job.parsedJson?.jobTitle || job.rawText.slice(0, 50)
            const company = job.parsedJson?.company
            return (
              <motion.button
                key={job.id}
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setJobId(job.id)}
                className={cn(
                  "relative text-left p-4 rounded-xl border-2 transition-all select-none cursor-pointer",
                  selected
                    ? "border-ink bg-ink text-paper shadow-paper -rotate-1"
                    : "border-line bg-paper/80 hover:border-ink text-ink shadow-xs",
                )}
              >
                <span className="hand text-xl font-bold block truncate">{title}</span>
                <p className={cn("text-xs mt-1 truncate", selected ? "text-paper/80" : "text-muted")}>
                  🏢 {company ? company : "Perusahaan Target"}
                </p>
              </motion.button>
            )
          })}
        </div>
      </Card>

      {/* Step 3: Boss Interviewer Style Selection */}
      <Card tape="red" pin rotate={-0.5} className="space-y-4 p-6 sm:p-8">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <span className="bg-ink text-paper h-7 w-7 rounded-lg flex items-center justify-center font-bold text-sm">
              3
            </span>
            <h2 className="hand text-2xl font-bold text-ink">
              {lang === "id" ? "Pilih Boss Pewawancara 🎭" : "Select Boss Interviewer Style 🎭"}
            </h2>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {INTERVIEW_PERSONAS.map((p) => {
            const label = INTERVIEW_PERSONA_LABELS[p]
            const diff = DIFFICULTY_MAP[p]
            const selected = persona === p

            return (
              <motion.button
                key={p}
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setPersona(p)}
                className={cn(
                  "relative text-left p-5 rounded-2xl border-2 transition-all select-none cursor-pointer flex flex-col justify-between space-y-3",
                  selected
                    ? "border-ink bg-panel shadow-lift ring-2 ring-ink -rotate-1"
                    : "border-line bg-paper/60 hover:border-ink shadow-paper",
                )}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-3xl">{label.emoji}</span>
                    <span className={cn("label px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border", diff.color)}>
                      {diff.badge}
                    </span>
                  </div>

                  <h3 className="hand text-2xl font-bold text-ink">
                    {lang === "id" ? label.id : label.en}
                  </h3>

                  <p className="text-muted text-xs leading-relaxed mt-1">
                    {lang === "id" ? label.hint.id : label.hint.en}
                  </p>
                </div>

                <div className="pt-2 border-t border-line/60 flex items-center justify-between text-xs font-bold">
                  <span className="text-muted">{diff.level}</span>
                  {selected && <span className="text-green font-bold flex items-center gap-1">✓ Siap Ditantang</span>}
                </div>
              </motion.button>
            )
          })}
        </div>
      </Card>

      {error && (
        <Sticky tone="red" rotate={-0.5} className="text-center py-4">
          <p className="hand text-2xl font-bold text-red">{error}</p>
        </Sticky>
      )}

      {/* Gamified Action Footer */}
      <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-panel border-2 border-line rounded-2xl p-6 shadow-paper">
        <div className="text-center sm:text-left">
          <p className="hand text-2xl font-bold text-ink">
            {isReady ? "Siapkan Microfon & Tempat Tenang 🎧" : "Pilih CV Terlebih Dahulu ⚠️"}
          </p>
          <p className="scrawl text-muted text-sm">
            AI akan menyapa lewat audio live secara dua arah.
          </p>
        </div>

        <Button
          variant="danger"
          size="lg"
          icon={<FiMic />}
          tape="red"
          isLoading={createMutation.isPending}
          disabled={!isReady || createMutation.isPending}
          onClick={() => createMutation.mutate()}
          className="w-full sm:w-auto px-8"
        >
          {createMutation.isPending
            ? "Menyiapkan Arena…"
            : lang === "id"
            ? "🔥 MULAI TANDING SEKARANG 🎙️"
            : "🔥 START LIVE INTERVIEW 🎙️"}
        </Button>
      </div>
    </div>
  )
}
