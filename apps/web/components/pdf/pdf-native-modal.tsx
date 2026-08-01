"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import { FiDownload, FiExternalLink, FiFileText } from "react-icons/fi"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/modal"

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString()

export function PdfNativeModal({
  file,
  title = "Preview PDF",
  isOpen,
  onClose,
}: {
  file: Blob | null
  title?: string
  isOpen: boolean
  onClose: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [numPages, setNumPages] = useState(0)

  const objectUrl = useMemo(() => {
    if (!file || !isOpen) return null
    return URL.createObjectURL(file)
  }, [file, isOpen])

  useEffect(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [objectUrl])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => {
      const newWidth = Math.max(0, el.clientWidth - 24)
      setWidth((prev) => (prev === 0 || Math.abs(prev - newWidth) > 8 ? newWidth : prev))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [isOpen])

  const handleDownload = () => {
    if (!objectUrl) return
    const a = document.createElement("a")
    a.href = objectUrl
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`
    a.click()
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose()
      }}
    >
      <DialogContent className="w-[94vw] sm:w-[85vw] lg:w-[75vw] xl:max-w-[1000px] max-w-[94vw] sm:max-w-[85vw] lg:max-w-[75vw] h-[85vh] sm:h-[90vh] flex flex-col p-3 sm:p-4 gap-3">
        {/* Compact Responsive Header */}
        <DialogHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pr-8 shrink-0 space-y-0">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl text-ink min-w-0 w-full sm:w-auto">
            <FiFileText className="h-5 w-5 text-blue shrink-0" />
            <span className="truncate">{title}</span>
            {numPages > 0 && (
              <span className="text-xs text-muted font-normal ml-1">({numPages} Halaman)</span>
            )}
          </DialogTitle>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            {objectUrl && (
              <a
                href={objectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold label bg-paper border border-line px-2.5 py-1.5 rounded-md hover:bg-ink hover:text-paper transition-colors"
              >
                <FiExternalLink className="h-3.5 w-3.5" />
                <span>Tab Baru</span>
              </a>
            )}
            <Button variant="primary" size="sm" icon={<FiDownload />} onClick={handleDownload}>
              Unduh
            </Button>
          </div>
        </DialogHeader>

        {/* Modal Body: Scrollable PDF Canvas Container */}
        <div
          ref={containerRef}
          className="flex-1 w-full bg-white rounded-xl border-2 border-line overflow-y-auto overflow-x-hidden p-3 shadow-inner"
        >
          {objectUrl ? (
            <Document
              file={objectUrl}
              onLoadSuccess={({ numPages: n }) => setNumPages(n)}
              loading={
                <div className="flex flex-col items-center justify-center h-64 space-y-3">
                  <div className="bg-line/30 h-48 w-full animate-pulse rounded-lg" />
                  <p className="scrawl text-muted text-sm">Menyiapkan preview PDF…</p>
                </div>
              }
              error={<p className="text-red text-xs font-semibold p-4">Gagal membaca file PDF</p>}
            >
              {width > 0 && (
                <div className="space-y-4 flex flex-col items-center">
                  {Array.from({ length: numPages }, (_, i) => (
                    <div key={i} className="border border-line/60 shadow-md rounded overflow-hidden">
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
          ) : (
            <div className="h-full flex flex-col items-center justify-center space-y-2 p-8 text-center">
              <div className="bg-line/30 h-24 w-24 animate-pulse rounded-full" />
              <p className="scrawl text-muted text-base">Menyiapkan preview PDF…</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
