"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { FiArrowLeft, FiMic } from "react-icons/fi"
import { INTERVIEW_PERSONAS, INTERVIEW_PERSONA_LABELS, type InterviewPersona } from "@dilirik/shared"
import { api, errorMessage } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, Sticky } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"

type CvItem = { id: string; title: string; version: number; language: string }
type JobItem = { id: string; parsedJson: { jobTitle?: string; company?: string } | null; rawText: string }

export default function NewInterviewPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center">Memuat…</p>}>
      <NewInterviewForm />
    </Suspense>
  )
}

function NewInterviewForm() {
  const router = useRouter()
  const params = useSearchParams()
  const queryClient = useQueryClient()
  const { lang } = useI18n()

  // Prefill dari CTA jembatan (wizard Finish / tracker status Interview)
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

  // Kalau CV prefill sudah tidak ada (mis. dihapus), lepas pilihan.
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

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-8">
      <div className="flex items-center gap-3">
        <Link href="/app/interview" className="inline-flex items-center gap-1 text-sm underline">
          <FiArrowLeft /> {lang === "id" ? "Kembali" : "Back"}
        </Link>
      </div>
      <div>
        <h1 className="scrawl text-3xl font-bold">🎙️ {lang === "id" ? "Latihan Interview Baru" : "New Mock Interview"}</h1>
        <p className="mt-1 opacity-70">
          {lang === "id"
            ? "Pewawancara AI akan menyapa lewat suara — siapkan mic dan tempat yang tenang."
            : "The AI interviewer talks to you by voice — grab your mic and a quiet spot."}
        </p>
      </div>

      {/* 1. Pilih CV (wajib) */}
      <Card tape="yellow">
        <h2 className="mb-3 font-bold">1. {lang === "id" ? "Pilih CV" : "Pick a CV"}</h2>
        {cvsQuery.isLoading ? (
          <p className="opacity-70">{lang === "id" ? "Memuat CV…" : "Loading CVs…"}</p>
        ) : cvs.length === 0 ? (
          <EmptyState
            title={lang === "id" ? "Belum ada CV" : "No CVs yet"}
            ctaLabel={lang === "id" ? "Tambah CV dulu" : "Add a CV first"}
            ctaHref="/app/cv/new"
          />
        ) : (
          <div className="space-y-2">
            {cvs.map((cv) => (
              <button
                key={cv.id}
                type="button"
                onClick={() => setCvId(cv.id)}
                className={cn(
                  "block w-full rounded-lg border-2 border-ink/20 px-4 py-2 text-left transition",
                  cvId === cv.id ? "border-ink bg-paper-yellow font-bold" : "hover:border-ink/50",
                )}
              >
                {cv.title} <span className="text-sm opacity-60">v{cv.version}</span>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* 2. Lowongan (opsional) */}
      <Card tape="blue">
        <h2 className="mb-3 font-bold">
          2. {lang === "id" ? "Lowongan (opsional)" : "Job posting (optional)"}
        </h2>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setJobId(null)}
            className={cn(
              "block w-full rounded-lg border-2 border-ink/20 px-4 py-2 text-left transition",
              jobId === null ? "border-ink bg-paper-yellow font-bold" : "hover:border-ink/50",
            )}
          >
            {lang === "id" ? "Interview umum (tanpa lowongan spesifik)" : "General interview (no specific job)"}
          </button>
          {jobs.map((job) => (
            <button
              key={job.id}
              type="button"
              onClick={() => setJobId(job.id)}
              className={cn(
                "block w-full rounded-lg border-2 border-ink/20 px-4 py-2 text-left transition",
                jobId === job.id ? "border-ink bg-paper-yellow font-bold" : "hover:border-ink/50",
              )}
            >
              {job.parsedJson?.jobTitle || job.rawText.slice(0, 60)}
              {job.parsedJson?.company ? <span className="text-sm opacity-60"> — {job.parsedJson.company}</span> : null}
            </button>
          ))}
        </div>
      </Card>

      {/* 3. Persona pewawancara */}
      <Card tape="red">
        <h2 className="mb-3 font-bold">3. {lang === "id" ? "Gaya pewawancara" : "Interviewer style"}</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {INTERVIEW_PERSONAS.map((p) => {
            const label = INTERVIEW_PERSONA_LABELS[p]
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPersona(p)}
                className={cn(
                  "rounded-lg border-2 border-ink/20 px-4 py-3 text-left transition",
                  persona === p ? "border-ink bg-paper-yellow" : "hover:border-ink/50",
                )}
              >
                <span className="font-bold">
                  {label.emoji} {lang === "id" ? label.id : label.en}
                </span>
                <span className="mt-1 block text-sm opacity-70">{lang === "id" ? label.hint.id : label.hint.en}</span>
              </button>
            )
          })}
        </div>
      </Card>

      {error && (
        <Sticky tone="red" rotate={-0.5}>
          <p className="font-bold">{error}</p>
        </Sticky>
      )}

      <div className="flex justify-end">
        <Button
          variant="primary"
          size="lg"
          icon={<FiMic />}
          isLoading={createMutation.isPending}
          disabled={!cvId || createMutation.isPending}
          onClick={() => createMutation.mutate()}
        >
          {lang === "id" ? "Mulai Sesi Latihan" : "Start Practice Session"}
        </Button>
      </div>
    </div>
  )
}
