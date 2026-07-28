"use client"

import { useParams, useRouter } from "next/navigation"
import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  COVER_LETTER_LENGTH_LABELS,
  COVER_LETTER_TONE_LABELS,
  type CoverLetterLength,
  type CoverLetterTone,
  type RejectedCoverLetterParagraph,
} from "@dilirik/shared"
import { api, errorMessage } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, Sticky } from "@/components/ui/card"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { CopyButton } from "@/components/ui/copy-button"
import { useToast } from "@/components/ui/toast"

type CoverLetterDetail = {
  id: string
  title: string
  language: string
  tone: string
  length: string
  bodyText: string
  rejectedJson: RejectedCoverLetterParagraph[] | null
  createdAt: string
}

const FORMATS = [
  { format: "txt", label: "Teks (.txt)" },
  { format: "docx", label: "Word (.docx)" },
  { format: "pdf", label: "PDF" },
] as const

export default function CoverLetterDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)

  const id = params.id

  const { data: letter, isLoading } = useQuery({
    queryKey: ["cover-letter", id],
    queryFn: async () =>
      (await api.get<{ coverLetter: CoverLetterDetail }>(`/api/cover-letter/${id}`)).data
        .coverLetter,
  })

  const remove = useMutation({
    mutationFn: async () => {
      await api.delete(`/api/cover-letter/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cover-letters"] })
      toast.show("Surat lamaran dihapus", "success")
      router.push("/app/cover-letter")
    },
    onError: (error) => toast.show(errorMessage(error), "error"),
  })

  async function download(format: string) {
    setDownloading(format)
    try {
      const response = await api.get(`/api/cover-letter/${id}/export/${format}`, {
        responseType: "blob",
      })
      const url = URL.createObjectURL(response.data as Blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `cover-letter-dilirik.${format}`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      toast.show(errorMessage(error), "error")
    } finally {
      setDownloading(null)
    }
  }

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-xl bg-line/40" />
  }
  if (!letter) {
    return <p className="text-sm text-muted">Surat tidak ditemukan.</p>
  }

  const rejected = letter.rejectedJson ?? []

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="scrawl text-3xl text-ink">{letter.title}</h1>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted">
            <span className="rounded-full border border-line px-2 py-0.5">
              {COVER_LETTER_TONE_LABELS[letter.tone as CoverLetterTone]?.id ?? letter.tone}
            </span>
            <span className="rounded-full border border-line px-2 py-0.5">
              {COVER_LETTER_LENGTH_LABELS[letter.length as CoverLetterLength]?.id ??
                letter.length}
            </span>
            <span className="rounded-full border border-line px-2 py-0.5 uppercase">
              {letter.language}
            </span>
          </div>
        </div>
        <Button variant="danger" size="sm" onClick={() => setConfirmOpen(true)}>
          Hapus
        </Button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Card tape="blue">
          <article className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
            {letter.bodyText}
          </article>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <p className="label text-xs text-muted">Ambil suratnya</p>
            <div className="mt-3 flex flex-col gap-2">
              <CopyButton text={letter.bodyText} label="📋 salin teks surat" />
              {FORMATS.map((item) => (
                <Button
                  key={item.format}
                  variant="secondary"
                  size="sm"
                  isLoading={downloading === item.format}
                  onClick={() => download(item.format)}
                >
                  Unduh {item.label}
                </Button>
              ))}
            </div>
          </Card>

          {rejected.length > 0 && (
            <Sticky tone="red" rotate={-1}>
              <p className="hand text-sm text-ink">
                {rejected.length} paragraf dibuang karena tidak terbukti di CV
              </p>
              <ul className="mt-2 flex list-disc flex-col gap-1 pl-4 text-xs text-muted">
                {rejected.map((item, i) => (
                  <li key={i}>{item.reason}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted">
                Lengkapi CV kamu supaya klaim ini bisa dipakai di surat berikutnya.
              </p>
            </Sticky>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Hapus surat lamaran ini?"
        description="Surat yang sudah dihapus tidak bisa dikembalikan."
        onConfirm={() => remove.mutate()}
      />
    </div>
  )
}
