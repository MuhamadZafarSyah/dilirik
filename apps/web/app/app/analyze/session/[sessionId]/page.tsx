"use client"

import { use, useCallback, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  FiArrowLeft,
  FiZap,
  FiCheckCircle,
  FiFileText,
  FiBriefcase,
  FiEdit3,
  FiCheck,
} from "react-icons/fi"
import type { SessionStep } from "@dilirik/shared"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { useI18n } from "@/lib/i18n"
import {
  StepCv,
  StepJob,
  StepReview,
  StepRevise,
  StepFinish,
  type Patch,
  type SessionDetail,
} from "@/components/session"

const STEPS: Array<{ key: SessionStep; label: string; icon: any }> = [
  { key: "CV", label: "CV", icon: FiFileText },
  { key: "JOB", label: "Lowongan", icon: FiBriefcase },
  { key: "REVIEW", label: "Hasil Match", icon: FiZap },
  { key: "REVISE", label: "Revisi Teks", icon: FiEdit3 },
  { key: "FINISH", label: "Selesai", icon: FiCheckCircle },
]

export default function SessionWizardPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params)
  const router = useRouter()
  const { t } = useI18n()
  const queryClient = useQueryClient()

  const sessionQuery = useQuery({
    queryKey: ["session", sessionId],
    queryFn: async () => {
      const { data } = await api.get<{ session: SessionDetail }>(`/api/sessions/${sessionId}`)
      return data.session
    },
  })

  const patchMutation = useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const { data } = await api.patch<{ session: SessionDetail }>(`/api/sessions/${sessionId}`, input)
      return data.session
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["session", sessionId], updated)
      queryClient.invalidateQueries({ queryKey: ["sessions"] })
    },
  })

  const { mutateAsync: patchAsync } = patchMutation
  const patch: Patch = useCallback(
    async (input) => {
      await patchAsync(input)
    },
    [patchAsync]
  )

  // Satu-satunya effect di halaman ini: navigasi keluar bila sesi tidak ditemukan (bukan data-fetching).
  useEffect(() => {
    if (sessionQuery.isError) router.replace("/app/analyze")
  }, [sessionQuery.isError, router])

  const session = sessionQuery.data

  if (!session) {
    return (
      <div className="space-y-6">
        <div className="bg-line/30 h-10 w-48 animate-pulse rounded-lg" />
        <div className="bg-line/20 h-96 animate-pulse rounded-xl border border-line" />
      </div>
    )
  }

  const stepIndex = STEPS.findIndex((s) => s.key === session.step)

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="label bg-yellow/30 border border-yellow/60 text-ink px-3 py-0.5 rounded-full text-xs font-bold uppercase">
              {session.status === "DRAFT" ? "Draft · Tersimpan Otomatis" : "Sesi Tuntas ✔︎"}
            </span>
          </div>
          <h1 className="hand text-4xl sm:text-5xl font-bold mt-1">Sesi Match & Analysis ⚡</h1>
        </div>
        <Link href="/app/analyze" className="label text-xs font-bold text-muted hover:text-ink flex items-center gap-1">
          <FiArrowLeft /> Semua Sesi
        </Link>
      </div>

      {/* Stepper Navigation Bar */}
      <div className="bg-panel/80 border-2 border-line rounded-2xl p-2 shadow-paper backdrop-blur-xs flex overflow-x-auto scrollbar-none gap-1 sm:gap-2">
        {STEPS.map((s, i) => {
          const isCurrent = i === stepIndex
          const isPast = i < stepIndex
          const Icon = s.icon
          return (
            <button
              key={s.key}
              disabled={!isPast}
              onClick={() => patch({ step: s.key })}
              className={`label relative flex-1 min-w-[100px] flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold uppercase transition-all select-none ${
                isCurrent
                  ? "bg-ink text-paper shadow-paper -rotate-1"
                  : isPast
                  ? "bg-green/15 text-green border border-green/40 cursor-pointer hover:bg-green/25"
                  : "bg-paper/50 text-muted opacity-50 cursor-not-allowed"
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>
                {i + 1}. {s.label}
              </span>
              {isPast && <FiCheck className="h-3.5 w-3.5 shrink-0 text-green" />}
            </button>
          )
        })}
      </div>

      {/* Animated Step Component */}
      <AnimatePresence mode="wait">
        <motion.div
          key={session.step}
          initial={{ opacity: 0, y: 12, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 0, scale: 1 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {session.step === "CV" && <StepCv patch={patch} />}
          {session.step === "JOB" && <StepJob session={session} patch={patch} />}
          {session.step === "REVIEW" && <StepReview session={session} patch={patch} />}
          {session.step === "REVISE" && <StepRevise session={session} patch={patch} />}
          {session.step === "FINISH" && <StepFinish session={session} patch={patch} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
