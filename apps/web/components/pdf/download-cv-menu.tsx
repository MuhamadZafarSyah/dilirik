"use client"

import { useMutation } from "@tanstack/react-query"
import { FiDownload, FiFileText } from "react-icons/fi"
import { api, errorMessage } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { DownloadCvButton } from "./download-cv-button"

type CvLike = {
  id: string
  title: string
  version: number
  language: string
  rawText: string
  fileKey?: string | null
}

function slugOf(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "cv"
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Opsi download CV dengan desain yang KONSISTEN antar format:
 * - "PDF (desain asli)" — file asli dikonversi apa adanya (DOCX via Gotenberg),
 *   hasilnya identik dengan file Word-nya, BUKAN render ulang template.
 * - "Word (.docx)" — file .docx asli.
 * - CV tanpa file desain (paste teks) → fallback PDF template Dilirik.
 *
 * compact: dipakai di header kartu (compare) — tombol outline kecil,
 * tanpa fallback template supaya kartu tetap bersih.
 */
export function DownloadCvMenu({ cv, compact = false }: { cv: CvLike; compact?: boolean }) {
  const { toast } = useToast()
  const isDocx = Boolean(cv.fileKey?.toLowerCase().endsWith(".docx"))

  const pdfMutation = useMutation({
    mutationFn: async () => {
      const res = await api.get<Blob>(`/api/cv/${cv.id}/file/pdf`, { responseType: "blob" })
      saveBlob(res.data, `${slugOf(cv.title)}-v${cv.version}-dilirik.pdf`)
    },
    onError: (err) => toast(errorMessage(err), "error"),
  })

  const docxMutation = useMutation({
    mutationFn: async () => {
      const res = await api.get<Blob>(`/api/cv/${cv.id}/file`, { responseType: "blob" })
      saveBlob(res.data, `${slugOf(cv.title)}-v${cv.version}-dilirik.docx`)
    },
    onError: (err) => toast(errorMessage(err), "error"),
  })

  if (!cv.fileKey) {
    if (compact) return null
    return (
      <DownloadCvButton rawText={cv.rawText} title={cv.title} version={cv.version} language={cv.language} />
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant={compact ? "outline" : "primary"}
        icon={<FiDownload />}
        isLoading={pdfMutation.isPending}
        onClick={() => pdfMutation.mutate()}
      >
        {pdfMutation.isPending ? "Menyiapkan PDF\u2026" : compact ? "PDF" : "PDF (desain asli)"}
      </Button>
      {isDocx && (
        <Button
          variant="outline"
          icon={<FiFileText />}
          isLoading={docxMutation.isPending}
          onClick={() => docxMutation.mutate()}
        >
          {docxMutation.isPending ? "Menyiapkan\u2026" : compact ? "Word" : "Word (.docx)"}
        </Button>
      )}
    </div>
  )
}
