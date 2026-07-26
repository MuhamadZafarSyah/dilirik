"use client"

import { useEffect, useRef, useState } from "react"
import { Document, Page, pdfjs } from "react-pdf"

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
 * Komponen ini HARUS dimuat via next/dynamic dengan ssr: false, karena pdf.js
 * memakai API browser (DOMMatrix dkk.) saat import.
 */
export function PdfViewer({
  file,
  isLoading = false,
  error = null,
  maxHeightClassName = "max-h-[560px]",
}: {
  file: Blob | null
  isLoading?: boolean
  error?: string | null
  maxHeightClassName?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [numPages, setNumPages] = useState(0)

  // Lebar halaman mengikuti lebar kontainer (responsive, tanpa horizontal scroll)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setWidth(Math.max(0, el.clientWidth - 24)) // minus padding
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div
      ref={containerRef}
      className={`rounded-xl border-2 border-line bg-white shadow-inner overflow-y-auto overflow-x-hidden p-3 ${maxHeightClassName}`}
    >
      {error ? (
        <p className="text-red text-xs font-semibold p-4">{error}</p>
      ) : isLoading || (!file && !error) ? (
        <div className="space-y-3 p-2" aria-label="Memuat preview PDF">
          <div className="bg-line/30 h-64 w-full animate-pulse rounded-lg" />
          <p className="scrawl text-muted text-center text-sm">Menyiapkan preview…</p>
        </div>
      ) : file ? (
        <Document
          file={file}
          onLoadSuccess={({ numPages: n }) => setNumPages(n)}
          loading={<div className="bg-line/30 h-64 w-full animate-pulse rounded-lg" />}
          error={<p className="text-red text-xs font-semibold p-4">Gagal membaca file PDF</p>}
        >
          <div className="space-y-3">
            {Array.from({ length: numPages }, (_, i) => (
              <div key={i} className="border border-line/60 shadow-sm">
                <Page
                  pageNumber={i + 1}
                  width={width || undefined}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  loading={<div className="bg-line/20 h-48 w-full animate-pulse" />}
                />
              </div>
            ))}
          </div>
        </Document>
      ) : null}
    </div>
  )
}

export default PdfViewer
