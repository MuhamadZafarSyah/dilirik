"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  COVER_LETTER_LANGUAGES,
  COVER_LETTER_LANGUAGE_LABELS,
  COVER_LETTER_LENGTHS,
  COVER_LETTER_LENGTH_LABELS,
  COVER_LETTER_TONES,
  COVER_LETTER_TONE_LABELS,
  type CoverLetterLanguage,
  type CoverLetterLength,
  type CoverLetterTone,
} from "@dilirik/shared"
import { api, errorMessage, isQuotaExceeded } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, Sticky } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/toast"

type CvItem = { id: string; title: string }
type JobItem = { id: string; parsedJson?: { jobTitle?: string; company?: string } }

function jobLabel(job: JobItem): string {
  const title = job.parsedJson?.jobTitle?.trim() || "Lowongan tanpa judul"
  const company = job.parsedJson?.company?.trim()
  return company ? `${title} — ${company}` : title
}

export default function NewCoverLetterPage() {
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [cvId, setCvId] = useState("")
  const [jobPostingId, setJobPostingId] = useState("")
  const [language, setLanguage] = useState<CoverLetterLanguage>("id")
  const [tone, setTone] = useState<CoverLetterTone>("PROFESIONAL")
  const [length, setLength] = useState<CoverLetterLength>("SEDANG")

  const { data: cvs } = useQuery({
    queryKey: ["cvs"],
    queryFn: async () => (await api.get<{ cvs: CvItem[] }>("/api/cv")).data.cvs,
  })

  const { data: jobs } = useQuery({
    queryKey: ["jobs"],
    queryFn: async () => (await api.get<{ jobs: JobItem[] }>("/api/jobs")).data.jobs,
  })

  const generate = useMutation({
    mutationFn: async () =>
      (
        await api.post<{ coverLetter: { id: string } }>("/api/cover-letter", {
          cvId,
          jobPostingId,
          language,
          tone,
          length,
        })
      ).data.coverLetter,
    onSuccess: (coverLetter) => {
      queryClient.invalidateQueries({ queryKey: ["cover-letters"] })
      queryClient.invalidateQueries({ queryKey: ["cover-letter-quota"] })
      toast("Surat lamaran selesai dibuat", "success")
      router.push(`/app/cover-letter/${coverLetter.id}`)
    },
    onError: (error) => {
      toast(
        isQuotaExceeded(error)
          ? "Kuota cover letter bulan ini sudah habis."
          : errorMessage(error),
        "error",
      )
    },
  })

  const ready = Boolean(cvId && jobPostingId)

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="scrawl text-3xl text-ink">Buat cover letter</h1>
        <p className="mt-1 text-sm text-muted">
          Pilih CV dan lowongan yang sudah tersimpan. Surat hanya boleh memakai fakta yang ada
          di CV kamu.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Card tape="yellow">
          <div className="flex flex-col gap-5">
            <label className="flex flex-col gap-2">
              <span className="label text-xs text-muted">CV yang dipakai</span>
              <Select value={cvId} onValueChange={setCvId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih CV" />
                </SelectTrigger>
                <SelectContent>
                  {(cvs ?? []).map((cv) => (
                    <SelectItem key={cv.id} value={cv.id}>
                      {cv.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="label text-xs text-muted">Lowongan yang dilamar</span>
              <Select value={jobPostingId} onValueChange={setJobPostingId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih lowongan" />
                </SelectTrigger>
                <SelectContent>
                  {(jobs ?? []).map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {jobLabel(job)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <div className="grid gap-5 sm:grid-cols-3">
              <label className="flex flex-col gap-2">
                <span className="label text-xs text-muted">Bahasa</span>
                <Select
                  value={language}
                  onValueChange={(v) => setLanguage(v as CoverLetterLanguage)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COVER_LETTER_LANGUAGES.map((code) => (
                      <SelectItem key={code} value={code}>
                        {COVER_LETTER_LANGUAGE_LABELS[code].id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="label text-xs text-muted">Tone</span>
                <Select value={tone} onValueChange={(v) => setTone(v as CoverLetterTone)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COVER_LETTER_TONES.map((code) => (
                      <SelectItem key={code} value={code}>
                        {COVER_LETTER_TONE_LABELS[code].emoji}{" "}
                        {COVER_LETTER_TONE_LABELS[code].id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="label text-xs text-muted">Panjang</span>
                <Select value={length} onValueChange={(v) => setLength(v as CoverLetterLength)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COVER_LETTER_LENGTHS.map((code) => (
                      <SelectItem key={code} value={code}>
                        {COVER_LETTER_LENGTH_LABELS[code].id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            </div>

            <p className="text-xs text-muted">{COVER_LETTER_TONE_LABELS[tone].hint.id}</p>

            <div>
              <Button
                variant="primary"
                size="lg"
                tape="blue"
                disabled={!ready}
                isLoading={generate.isPending}
                onClick={() => generate.mutate()}
              >
                Buatkan surat
              </Button>
            </div>
          </div>
        </Card>

        <Sticky tone="yellow" rotate={1.2}>
          <p className="hand text-sm text-ink">Kenapa suratnya terasa “jujur”?</p>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-4 text-xs text-muted">
            <li>Tiap paragraf wajib menyebut bukti dari CV kamu.</li>
            <li>Paragraf yang buktinya tidak ada di CV otomatis dibuang.</li>
            <li>Skill yang belum kamu punya tidak akan diklaim.</li>
          </ul>
        </Sticky>
      </div>
    </div>
  )
}
