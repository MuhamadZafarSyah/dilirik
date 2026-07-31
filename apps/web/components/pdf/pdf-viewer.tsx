"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import { FiMaximize2 } from "react-icons/fi"
import { Button } from "@/components/ui/button"
import { PdfNativeModal } from "./pdf-native-modal"

// Worker pdf.js di-bundle webpack dari pdfjs-dist (dependency react-pdf)
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString()

/**
 * Viewer PDF inline (semua halaman, scroll vertikal) untuk panel compare
 * Before/After. Text layer & annotation layer dimatikan — murni preview visual,
 * jadi tidak perlu import CSS react-pdf.
 *
 * Dilengkapi tombol aksi untuk membuka Modal dengan render Embed Native PDF.
 *
 * Komponen ini HARUS dimuat via next/dynamic dengan ssr: false, karena pdf.js
 * memakai API browser (DOMMatrix dkk.) saat import.
 */
export function PdfViewer({
  file,
  title = "Preview PDF",
  isLoading = false,
  error = null,
  maxHeightClassName = "max-h-[560px]",
}: {
  file: Blob | null
  title?: string
  isLoading?: boolean
  error?: string | null
  maxHeightClassName?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [numPages, setNumPages] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Memoisasi Object URL agar referensi file ke react-pdf/pdf.js stabil & tidak re-parse terus menerus
  const fileUrl = useMemo(() => {
    if (!file) return null
    return URL.createObjectURL(file)
  }, [file])

  useEffect(() => {
    return () => {
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl)
      }
    }
  }, [fileUrl])

  // Lebar halaman mengikuti lebar kontainer dengan toleransi ambang batas (mencegah feedback loop resize akibat scrollbar)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => {
      const newWidth = Math.max(0, el.clientWidth - 24) // minus padding
      setWidth((prev) => (prev === 0 || Math.abs(prev - newWidth) > 8 ? newWidth : prev))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div className="space-y-2">
      {/* Top Action Header: Button to open Modal with Native PDF Embed */}
      {fileUrl && !isLoading && !error && (
        <div className="flex items-center justify-between px-1">
          <span className="label text-[11px] text-muted font-bold uppercase">
            {numPages > 0 ? `${numPages} Halaman` : "Preview PDF"}
          </span>
          <Button
            variant="outline"
            size="sm"
            icon={<FiMaximize2 className="h-3.5 w-3.5" />}
            onClick={() => setIsModalOpen(true)}
            className="text-xs font-bold"
          >
            Layar Penuh (Native PDF)
          </Button>
        </div>
      )}

      <div
        ref={containerRef}
        className={`rounded-xl border-2 border-line bg-white shadow-inner overflow-y-auto [scrollbar-gutter:stable] overflow-x-hidden p-3 ${maxHeightClassName}`}
      >
        {error ? (
          <p className="text-red text-xs font-semibold p-4">{error}</p>
        ) : isLoading || (!fileUrl && !error) ? (
          <div className="space-y-3 p-2" aria-label="Memuat preview PDF">
            <div className="bg-line/30 h-64 w-full animate-pulse rounded-lg" />
            <p className="scrawl text-muted text-center text-sm">Menyiapkan preview…</p>
          </div>
        ) : (
          <Document
            file={fileUrl}
            onLoadSuccess={({ numPages: n }) => setNumPages(n)}
            loading={<div className="bg-line/30 h-64 w-full animate-pulse rounded-lg" />}
            error={<p className="text-red text-xs font-semibold p-4">Gagal membaca file PDF</p>}
          >
            {width > 0 && (
              <div className="space-y-3">
                {Array.from({ length: numPages }, (_, i) => (
                  <div key={i} className="border border-line/60 shadow-sm">
                    <Page
                      pageNumber={i + 1}
                      width={width}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      loading={null}
                    />
                  </div>
                ))}
              </div>
            )}
          </Document>
        )}
      </div>

      {/* Modal with Embed Native PDF */}
      <PdfNativeModal
        file={file}
        title={title}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  )
}

export default PdfViewer


