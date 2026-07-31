"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import {
  FiArrowLeft,
  FiArrowRight,
  FiMic,
  FiFileText,
  FiBriefcase,
  FiCheck,
  FiZap,
  FiTarget,
  FiGlobe,
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

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 40 : -40,
    opacity: 0,
    scale: 0.98,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: { duration: 0.25, ease: "easeOut" },
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 40 : -40,
    opacity: 0,
    scale: 0.98,
    transition: { duration: 0.2, ease: "easeIn" },
  }),
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

  // Step state: 1 (CV), 2 (Job), 3 (Persona & Language)
  const [step, setStep] = useState<number>(1)
  const [direction, setDirection] = useState<number>(1)

  const [cvId, setCvId] = useState<string | null>(prefCvId)
  const [jobId, setJobId] = useState<string | null>(prefJobId)
  const [persona, setPersona] = useState<InterviewPersona>("NETRAL")
  const [interviewLang, setInterviewLang] = useState<"id" | "en">(lang)
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
        language: interviewLang,
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

  const selectedCv = cvs.find((c) => c.id === cvId)
  const selectedJob = jobs.find((j) => j.id === jobId)
  const selectedJobTitle = selectedJob
    ? selectedJob.parsedJson?.jobTitle || selectedJob.rawText.slice(0, 40)
    : lang === "id"
    ? "Arena Umum (HR General)"
    : "General HR Arena"

  // Handlers for tactile card selection with auto-advance
  const handleSelectCv = (id: string) => {
    setCvId(id)
    setTimeout(() => {
      setDirection(1)
      setStep(2)
    }, 220)
  }

  const handleSelectJob = (id: string | null) => {
    setJobId(id)
    setTimeout(() => {
      setDirection(1)
      setStep(3)
    }, 220)
  }

  const prevStep = () => {
    if (step > 1) {
      setDirection(-1)
      setStep(step - 1)
    } else {
      router.push("/app/interview")
    }
  }

  const nextStep = () => {
    if (step < 3) {
      setDirection(1)
      setStep(step + 1)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-3.5 sm:p-6">
      {/* Top Bar: Back Button & Duolingo-style Progress Bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={prevStep}
            className="label text-xs font-bold text-muted hover:text-ink flex items-center gap-1.5 bg-paper border-2 border-line px-3 py-1.5 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <FiArrowLeft className="h-4 w-4" />
            <span>
              {step > 1
                ? lang === "id"
                  ? `Kembali ke Step ${step - 1}`
                  : `Back to Step ${step - 1}`
                : lang === "id"
                ? "Keluar Arena"
                : "Exit Arena"}
            </span>
          </button>

          <div className="flex items-center gap-2">
            <span className="label bg-yellow/30 border border-yellow/60 text-ink px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider hidden sm:inline-block">
              🎮 Mode Gamifikasi
            </span>
            <span className="label bg-ink text-paper px-3 py-1 rounded-full text-xs font-bold shrink-0">
              Step {step} / 3
            </span>
          </div>
        </div>

        {/* Duolingo Progress Fill */}
        <div className="relative w-full bg-panel border-2 border-line rounded-full h-3.5 overflow-hidden shadow-inner p-0.5">
          <motion.div
            className="h-full bg-green-500 rounded-full"
            initial={{ width: "33.33%" }}
            animate={{ width: `${(step / 3) * 100}%` }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Main Animated Wizard Screen */}
      <div className="relative overflow-hidden min-h-[420px]">
        <AnimatePresence mode="wait" custom={direction}>
          {step === 1 && (
            <motion.div
              key="step1"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="space-y-4"
            >
              <Card tape="yellow" pin rotate={-0.5} className="space-y-5 p-5 sm:p-7">
                <div className="border-b-2 border-line pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="bg-ink text-paper h-8 w-8 rounded-xl flex items-center justify-center font-bold text-sm shadow-xs">
                      1
                    </span>
                    <div>
                      <h2 className="hand text-2xl sm:text-3xl font-bold text-ink">
                        {lang === "id" ? "Pilih Karakter CV Kamu 📄" : "Choose Your CV Character 📄"}
                      </h2>
                      <p className="text-xs text-muted font-bold mt-0.5">
                        {lang === "id"
                          ? "Pilih CV master yang akan menjadi acuan pewawancara AI."
                          : "Select the master CV to be evaluated by the AI interviewer."}
                      </p>
                    </div>
                  </div>
                </div>

                {cvsQuery.isLoading ? (
                  <p className="scrawl text-muted text-lg py-8 text-center">{lang === "id" ? "Memuat koleksi CV…" : "Loading CVs…"}</p>
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
                          onClick={() => handleSelectCv(cv.id)}
                          className={cn(
                            "relative text-left p-4 rounded-xl border-2 transition-all select-none cursor-pointer flex flex-col justify-between space-y-2",
                            selected
                              ? "border-ink bg-ink text-paper shadow-paper -rotate-1"
                              : "border-line bg-paper/80 hover:border-ink text-ink shadow-xs"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="hand text-xl font-bold truncate">{cv.title}</span>
                            <span
                              className={cn(
                                "label px-2 py-0.5 rounded text-[10px] uppercase font-bold shrink-0",
                                selected ? "bg-yellow text-ink" : "bg-panel text-muted"
                              )}
                            >
                              v{cv.version}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs pt-1 border-t border-line/40">
                            <span className={selected ? "text-paper/80 font-bold" : "text-muted font-bold"}>
                              {cv.language.toUpperCase()}
                            </span>
                            {selected && <span className="text-yellow font-bold text-sm">✓ Terpilih</span>}
                          </div>
                        </motion.button>
                      )
                    })}
                  </div>
                )}

                {/* Footer Navigation CTA */}
                <div className="pt-3 border-t-2 border-line flex items-center justify-between gap-3">
                  <span className="text-xs text-muted font-bold">
                    {cvId ? (lang === "id" ? "✓ CV sudah dipilih" : "✓ CV selected") : lang === "id" ? "Pilih salah satu CV di atas" : "Select a CV above"}
                  </span>
                  <Button
                    variant="yellow"
                    size="md"
                    disabled={!cvId}
                    onClick={nextStep}
                    icon={<FiArrowRight />}
                  >
                    {lang === "id" ? "Lanjut ke Target Lowongan" : "Next to Target Job"}
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="space-y-4"
            >
              <Card tape="blue" rotate={0.5} className="space-y-5 p-5 sm:p-7">
                <div className="border-b-2 border-line pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="bg-ink text-paper h-8 w-8 rounded-xl flex items-center justify-center font-bold text-sm shadow-xs">
                      2
                    </span>
                    <div>
                      <h2 className="hand text-2xl sm:text-3xl font-bold text-ink">
                        {lang === "id" ? "Target Arena Lowongan 🎯" : "Target Job Arena 🎯"}
                      </h2>
                      <p className="text-xs text-muted font-bold mt-0.5">
                        {lang === "id"
                          ? "Pilih posisi & perusahaan yang ingin kamu simulasikan."
                          : "Choose the position & company you want to simulate."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {/* General HR Arena Option */}
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelectJob(null)}
                    className={cn(
                      "relative text-left p-4 rounded-xl border-2 transition-all select-none cursor-pointer flex flex-col justify-between space-y-2",
                      jobId === null
                        ? "border-ink bg-ink text-paper shadow-paper -rotate-1"
                        : "border-line bg-paper/80 hover:border-ink text-ink shadow-xs"
                    )}
                  >
                    <div>
                      <span className="hand text-xl font-bold block">
                        🌐 {lang === "id" ? "Arena Umum (HR General)" : "General Arena (HR General)"}
                      </span>
                      <p className={cn("text-xs mt-1 leading-relaxed", jobId === null ? "text-paper/80" : "text-muted")}>
                        {lang === "id"
                          ? "Cocok untuk latihan bebas pertanyaan umum rekruter."
                          : "Great for open practice with general recruiter questions."}
                      </p>
                    </div>
                    {jobId === null && (
                      <span className="text-yellow text-xs font-bold self-end border-t border-paper/20 pt-1 w-full text-right">
                        ✓ Terpilih
                      </span>
                    )}
                  </motion.button>

                  {/* Saved Jobs List */}
                  {jobs.map((job) => {
                    const selected = jobId === job.id
                    const title = job.parsedJson?.jobTitle || job.rawText.slice(0, 45)
                    const company = job.parsedJson?.company
                    return (
                      <motion.button
                        key={job.id}
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSelectJob(job.id)}
                        className={cn(
                          "relative text-left p-4 rounded-xl border-2 transition-all select-none cursor-pointer flex flex-col justify-between space-y-2",
                          selected
                            ? "border-ink bg-ink text-paper shadow-paper -rotate-1"
                            : "border-line bg-paper/80 hover:border-ink text-ink shadow-xs"
                        )}
                      >
                        <div>
                          <span className="hand text-xl font-bold block truncate">{title}</span>
                          <p className={cn("text-xs mt-1 truncate font-bold", selected ? "text-paper/80" : "text-muted")}>
                            🏢 {company ? company : "Perusahaan Target"}
                          </p>
                        </div>
                        {selected && (
                          <span className="text-yellow text-xs font-bold self-end border-t border-paper/20 pt-1 w-full text-right">
                            ✓ Terpilih
                          </span>
                        )}
                      </motion.button>
                    )
                  })}
                </div>

                {/* Footer Navigation CTA */}
                <div className="pt-3 border-t-2 border-line flex items-center justify-between gap-3">
                  <Button variant="secondary" size="md" onClick={prevStep}>
                    ← Kembali
                  </Button>
                  <Button
                    variant="yellow"
                    size="md"
                    onClick={nextStep}
                    icon={<FiArrowRight />}
                  >
                    {lang === "id" ? "Lanjut ke Mode Boss" : "Next to Boss Mode"}
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="space-y-4"
            >
              <Card tape="red" pin rotate={-0.5} className="space-y-5 p-5 sm:p-7">
                <div className="border-b-2 border-line pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="bg-ink text-paper h-8 w-8 rounded-xl flex items-center justify-center font-bold text-sm shadow-xs">
                      3
                    </span>
                    <div>
                      <h2 className="hand text-2xl sm:text-3xl font-bold text-ink">
                        {lang === "id" ? "Pilih Mode Pewawancara 🎭" : "Select Boss Interviewer Style 🎭"}
                      </h2>
                      <p className="text-xs text-muted font-bold mt-0.5">
                        {lang === "id"
                          ? "Pilih tingkat kesulitan pewawancara dan bahasa interview."
                          : "Choose interviewer difficulty and conversation language."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Boss Difficulty Selector */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-muted uppercase">
                    1. Level Kesulitan Pewawancara:
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
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
                            "relative text-left p-4 rounded-xl border-2 transition-all select-none cursor-pointer flex flex-col justify-between space-y-2",
                            selected
                              ? "border-ink bg-panel shadow-lift ring-2 ring-ink -rotate-1"
                              : "border-line bg-paper/60 hover:border-ink shadow-paper"
                          )}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-2xl">{label.emoji}</span>
                              <span className={cn("label px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border", diff.color)}>
                                {diff.badge}
                              </span>
                            </div>
                            <h3 className="hand text-xl font-bold text-ink">
                              {lang === "id" ? label.id : label.en}
                            </h3>
                            <p className="text-muted text-xs leading-relaxed mt-1">
                              {lang === "id" ? label.hint.id : label.hint.en}
                            </p>
                          </div>
                          <div className="pt-2 border-t border-line/60 flex items-center justify-between text-[11px] font-bold">
                            <span className="text-muted">{diff.level}</span>
                            {selected && <span className="text-green font-bold flex items-center gap-1">✓ Terpilih</span>}
                          </div>
                        </motion.button>
                      )
                    })}
                  </div>
                </div>

                {/* Language Selector */}
                <div className="space-y-2 pt-2 border-t border-line/60">
                  <label className="block text-xs font-bold text-muted uppercase">
                    2. Bahasa Percakapan Pewawancara:
                  </label>
                  <div className="grid gap-3 grid-cols-2">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setInterviewLang("id")}
                      className={cn(
                        "relative text-left p-3.5 rounded-xl border-2 transition-all select-none cursor-pointer flex items-center justify-between",
                        interviewLang === "id"
                          ? "border-ink bg-ink text-paper shadow-paper"
                          : "border-line bg-paper/80 hover:border-ink text-ink shadow-xs"
                      )}
                    >
                      <span className="hand text-lg font-bold">🇮🇩 Indonesia</span>
                      {interviewLang === "id" && <span className="text-yellow text-lg font-bold">✓</span>}
                    </motion.button>

                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setInterviewLang("en")}
                      className={cn(
                        "relative text-left p-3.5 rounded-xl border-2 transition-all select-none cursor-pointer flex items-center justify-between",
                        interviewLang === "en"
                          ? "border-ink bg-ink text-paper shadow-paper"
                          : "border-line bg-paper/80 hover:border-ink text-ink shadow-xs"
                      )}
                    >
                      <span className="hand text-lg font-bold">🇬🇧 English</span>
                      {interviewLang === "en" && <span className="text-yellow text-lg font-bold">✓</span>}
                    </motion.button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {error && (
        <Sticky tone="red" rotate={-0.5} className="text-center py-4">
          <p className="hand text-2xl font-bold text-red">{error}</p>
        </Sticky>
      )}

      {/* Gamified Final Action Footer Bar */}
      {step === 3 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-panel border-2 border-line rounded-2xl p-5 shadow-paper space-y-3"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left space-y-1">
              <p className="hand text-2xl font-bold text-ink">
                Siapkan Microfon & Tempat Tenang 🎧
              </p>
              <p className="scrawl text-muted text-xs">
                CV: <span className="text-ink font-bold">{selectedCv?.title || "-"}</span> • Target:{" "}
                <span className="text-ink font-bold">{selectedJobTitle}</span>
              </p>
            </div>

            <Button
              variant="danger"
              size="lg"
              icon={<FiMic />}
              tape="red"
              isLoading={createMutation.isPending}
              disabled={!cvId || createMutation.isPending}
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
        </motion.div>
      )}
    </div>
  )
}

