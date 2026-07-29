"use client"

import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { FiDownload, FiFileText, FiMaximize2 } from "react-icons/fi"
import { api, errorMessage } from "@/lib/api"
import { track } from "@/lib/analytics/track"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { DownloadCvButton } from "./download-cv-button"
import { PdfNativeModal } from "./pdf-native-modal"

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
 * Opsi download & preview CV dengan desain yang KONSISTEN antar format:
 * - "PDF (desain asli)" — file asli dikonversi apa adanya (DOCX via Gotenberg).
 * - "Preview PDF Native" — membuka modal dengan embed native PDF.
 * - "Word (.docx)" — file .docx asli.
 * - CV tanpa file desain (paste teks) → fallback PDF template Dilirik.
 */
export function DownloadCvMenu({ cv, compact = false }: { cv: CvLike; compact?: boolean }) {
  const { toast } = useToast()
  const isDocx = Boolean(cv.fileKey?.toLowerCase().endsWith(".docx"))
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const pdfMutation = useMutation({
    mutationFn: async () => {
      const res = await api.get<Blob>(`/api/cv/${cv.id}/file/pdf`, { responseType: "blob" })
      saveBlob(res.data, `${slugOf(cv.title)}-v${cv.version}-dilirik.pdf`)
      track("export_downloaded", { format: "pdf", module: "cv" })
    },
    onError: (err) => toast(errorMessage(err), "error"),
  })

  const previewMutation = useMutation({
    mutationFn: async () => {
      if (pdfBlob) return pdfBlob
      const res = await api.get<Blob>(`/api/cv/${cv.id}/file/pdf`, { responseType: "blob" })
      setPdfBlob(res.data)
      return res.data
    },
    onSuccess: () => setIsModalOpen(true),
    onError: (err) => toast(errorMessage(err), "error"),
  })

  const docxMutation = useMutation({
    mutationFn: async () => {
      const res = await api.get<Blob>(`/api/cv/${cv.id}/file`, { responseType: "blob" })
      saveBlob(res.data, `${slugOf(cv.title)}-v${cv.version}-dilirik.docx`)
      track("export_downloaded", { format: "docx", module: "cv" })
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
        variant="outline"
        size={compact ? "sm" : "md"}
        icon={<FiMaximize2 />}
        isLoading={previewMutation.isPending}
        onClick={() => previewMutation.mutate()}
        title="Buka PDF di Modal Embed Native"
      >
        {previewMutation.isPending ? "Menyiapkan\u2026" : compact ? "Modal PDF" : "Preview PDF (Modal)"}
      </Button>

      <Button
        variant={compact ? "outline" : "primary"}
        size={compact ? "sm" : "md"}
        icon={<FiDownload />}
        isLoading={pdfMutation.isPending}
        onClick={() => pdfMutation.mutate()}
      >
        {pdfMutation.isPending ? "Menyiapkan PDF\u2026" : compact ? "PDF" : "PDF (desain asli)"}
      </Button>

      {isDocx && (
        <Button
          variant="outline"
          size={compact ? "sm" : "md"}
          icon={<FiFileText />}
          isLoading={docxMutation.isPending}
          onClick={() => docxMutation.mutate()}
        >
          {docxMutation.isPending ? "Menyiapkan\u2026" : compact ? "Word" : "Word (.docx)"}
        </Button>
      )}

      <PdfNativeModal
        file={pdfBlob}
        title={`${cv.title} (v${cv.version})`}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  )
}

