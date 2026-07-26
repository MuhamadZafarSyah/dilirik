"use client"

import dynamic from "next/dynamic"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"

// pdf.js memakai API browser saat import — wajib dynamic tanpa SSR
const PdfViewer = dynamic(
  () => import("@/components/pdf/pdf-viewer").then((m) => m.PdfViewer),
  { ssr: false },
)

/**
 * Status fitur konversi desain (Gotenberg).
 * Query key ["preview-status"] dibagi dengan step revisi wizard — sekali cek,
 * cache dipakai di semua halaman (sekaligus warm-up instance scale-to-zero).
 */
export function usePreviewStatus(enabled = true) {
  return useQuery({
    queryKey: ["preview-status"],
    staleTime: 4 * 60 * 1000,
    enabled,
    queryFn: async () => {
      const { data } = await api.get<{ enabled: boolean }>("/api/preview/status")
      return data
    },
  })
}

/**
 * Panel preview DESAIN ASLI sebuah CV:
 * - Upload PDF → dirender langsung dengan pdf.js (tanpa Gotenberg).
 * - Upload DOCX → dikonversi ke PDF via /api/preview (butuh Gotenberg aktif).
 * - Tanpa file desain (paste teks) / konversi nonaktif → fallback teks rapi.
 *
 * Query key ["cv-preview", cvId] juga dibagi dengan step revisi — file yang
 * sama tidak dikonversi dua kali.
 */
export function CvDesignPanel({
  cvId,
  fileKey,
  fallbackText,
  maxHeightClassName = "max-h-[36rem]",
}: {
  cvId: string
  fileKey: string | null | undefined
  fallbackText: string
  maxHeightClassName?: string
}) {
  const isDocx = Boolean(fileKey?.toLowerCase().endsWith(".docx"))
  const isPdf = Boolean(fileKey) && !isDocx
  const statusQuery = usePreviewStatus(isDocx)
  const previewEnabled = statusQuery.data?.enabled ?? false
  const canRender = isPdf || (isDocx && previewEnabled)

  const pdfQuery = useQuery({
    queryKey: ["cv-preview", cvId],
    staleTime: Infinity,
    enabled: canRender,
    queryFn: async () => {
      const res = await api.get<Blob>(`/api/preview/cv/${cvId}`, { responseType: "blob" })
      return res.data
    },
  })

  // Fallback teks: CV paste-teks, atau DOCX saat Gotenberg nonaktif
  if (!fileKey || (isDocx && !statusQuery.isLoading && !previewEnabled)) {
    return (
      <div className="space-y-2">
        <p className="label text-muted px-1 text-[11px] uppercase">
          {!fileKey
            ? "\ud83d\udcdd CV ini dibuat via paste teks — tidak ada file desain asli"
            : "\u26a0\ufe0f Konversi desain nonaktif (GOTENBERG_URL belum diset) — menampilkan teks"}
        </p>
        <pre
          className={`bg-paper border-line overflow-auto rounded-md border-2 p-4 text-xs leading-relaxed whitespace-pre-wrap ${maxHeightClassName}`}
        >
          {fallbackText}
        </pre>
      </div>
    )
  }

  return (
    <PdfViewer
      file={pdfQuery.data ?? null}
      isLoading={pdfQuery.isLoading || statusQuery.isLoading}
      error={pdfQuery.isError ? "Gagal memuat preview desain — coba muat ulang halaman" : null}
      maxHeightClassName={maxHeightClassName}
    />
  )
}
