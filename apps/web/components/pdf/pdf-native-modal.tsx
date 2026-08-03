"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import {
  FiChevronLeft,
  FiChevronRight,
  FiDownload,
  FiExternalLink,
  FiFileText,
  FiGrid,
  FiLayers,
  FiMaximize2,
  FiRotateCw,
  FiZoomIn,
  FiZoomOut,
} from "react-icons/fi"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/modal"
import { cn } from "@/lib/utils"

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
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
  const [containerWidth, setContainerWidth] = useState<number>(0)
  const [numPages, setNumPages] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [zoomScale, setZoomScale] = useState<number>(1)
  const [isFitWidth, setIsFitWidth] = useState<boolean>(true)
  const [rotation, setRotation] = useState<number>(0)
  const [viewMode, setViewMode] = useState<"single" | "continuous">("continuous")

  const scrollContainerRef = useRef<HTMLDivElement>(null)

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

  // Reset controls when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentPage(1)
      setZoomScale(1)
      setIsFitWidth(true)
      setRotation(0)
    }
  }, [isOpen])

  // Keyboard Shortcuts (Arrow left/right for page, +/- for zoom, R for rotate)
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing inside an input
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)) return

      if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault()
        handlePageChange(currentPage - 1)
      } else if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault()
        handlePageChange(currentPage + 1)
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault()
        handleZoomIn()
      } else if (e.key === "-") {
        e.preventDefault()
        handleZoomOut()
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault()
        handleRotate()
      } else if (e.key === "0") {
        e.preventDefault()
        handleToggleFitWidth()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, currentPage, numPages, zoomScale, isFitWidth])

  // Responsive width measuring via ResizeObserver
  const containerRefCallback = useCallback((node: HTMLDivElement | null) => {
    if (!node) return
    scrollContainerRef.current = node

    const updateWidth = () => {
      if (node.clientWidth > 0) {
        const padding = window.innerWidth < 640 ? 16 : 36
        const calculated = Math.max(260, node.clientWidth - padding)
        setContainerWidth((prev) => (prev === 0 || Math.abs(prev - calculated) > 6 ? calculated : prev))
      }
    }

    updateWidth()
    const timer = setTimeout(updateWidth, 100)
    const ro = new ResizeObserver(updateWidth)
    ro.observe(node)

    return () => {
      clearTimeout(timer)
      ro.disconnect()
    }
  }, [])

  // Auto update current page badge on scroll in continuous mode
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (viewMode !== "continuous" || numPages <= 1) return
    const container = e.currentTarget
    const scrollTop = container.scrollTop
    const children = container.querySelectorAll("[id^='pdf-page-']")

    children.forEach((child) => {
      const el = child as HTMLElement
      const pageNum = parseInt(el.id.replace("pdf-page-", ""), 10)
      if (el.offsetTop - container.offsetTop <= scrollTop + 140) {
        setCurrentPage(pageNum)
      }
    })
  }

  const handleDownload = () => {
    if (!objectUrl) return
    const a = document.createElement("a")
    a.href = objectUrl
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`
    a.click()
  }

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360)
  }

  const handleZoomIn = () => {
    setIsFitWidth(false)
    setZoomScale((prev) => Math.min(2.5, +(prev + 0.15).toFixed(2)))
  }

  const handleZoomOut = () => {
    setIsFitWidth(false)
    setZoomScale((prev) => Math.max(0.4, +(prev - 0.15).toFixed(2)))
  }

  const handleToggleFitWidth = () => {
    setIsFitWidth((prev) => !prev)
    if (!isFitWidth) setZoomScale(1)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= numPages) {
      setCurrentPage(newPage)
      if (viewMode === "continuous") {
        const pageEl = document.getElementById(`pdf-page-${newPage}`)
        pageEl?.scrollIntoView({ behavior: "smooth", block: "start" })
      }
    }
  }

  const baseWidth = containerWidth > 0 ? containerWidth : 600
  const renderWidth = isFitWidth ? baseWidth : Math.round(baseWidth * zoomScale)
  const displayZoomPercent = isFitWidth ? "Fit" : `${Math.round(zoomScale * 100)}%`

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose()
      }}
    >
      <DialogContent className="w-[98vw] sm:w-[92vw] lg:w-[85vw] xl:max-w-[1150px] max-w-[98vw] sm:max-w-[92vw] lg:max-w-[85vw] h-[94vh] flex flex-col p-2.5 sm:p-4 gap-2.5 ">
        {/* Header Bar */}
        <DialogHeader className="flex mt-2 md:mt-0 flex-row items-center justify-between gap-2 pr-9 sm:pr-10 shrink-0 space-y-0 pb-2 border-b border-line/70">
          <DialogTitle className="flex items-center gap-2 text-sm sm:text-lg md:text-xl text-ink min-w-0">
            <FiFileText className="h-4 w-4 sm:h-5 sm:w-5 text-blue shrink-0" />
            <span className="truncate max-w-[130px] xs:max-w-[200px] sm:max-w-[320px] md:max-w-[420px]">{title}</span>
            {numPages > 0 && (
              <span className="text-[11px] text-muted font-normal shrink-0 bg-panel border border-line px-1.5 py-0.5 rounded-full hidden sm:inline-block">
                {numPages} Hal
              </span>
            )}
          </DialogTitle>

          {/* Top Right Actions: Open in New Tab & Download next to Close button */}
          <div className="flex items-center  mr-2 gap-1.5 sm:gap-2 shrink-0">
            {objectUrl && (
              <a
                href={objectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 text-xs font-bold label bg-paper border border-line p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg hover:bg-ink hover:text-paper transition-colors shadow-xs"
                title="Buka PDF di tab baru"
              >
                <FiExternalLink className="size-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                <span className="hidden sm:inline">Tab Baru</span>
              </a>
            )}
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center justify-center gap-1.5 text-xs font-bold label bg-ink text-paper border border-ink p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg hover:bg-paper hover:text-ink transition-colors shadow-xs cursor-pointer"
              title="Unduh PDF"
            >
              <FiDownload className="size-3 sm:h-3.5 sm:w-3.5 shrink-0" />
              <span className="hidden sm:inline">Unduh</span>
            </button>
          </div>
        </DialogHeader>

        {/* Desktop Toolbar (Hidden on small mobile screens to prevent clutter) */}
        <div className="hidden sm:flex items-center justify-between gap-3 bg-panel border-2 border-line rounded-xl px-3 py-1.5 shadow-xs shrink-0 text-ink text-xs font-bold">
          {/* Left: Page Switcher */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg border border-line bg-paper hover:bg-ink hover:text-paper disabled:opacity-30 disabled:hover:bg-paper disabled:hover:text-ink transition-colors cursor-pointer"
              title="Halaman Sebelumnya (←)"
            >
              <FiChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1">
              <span>Hal</span>
              <input
                type="number"
                min={1}
                max={numPages || 1}
                value={currentPage}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10)
                  if (!isNaN(val)) handlePageChange(val)
                }}
                className="w-11 text-center bg-paper border border-line rounded-md py-0.5 font-mono text-xs focus:outline-none focus:border-ink font-bold"
              />
              <span className="text-muted">/ {numPages || 1}</span>
            </div>
            <button
              type="button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= numPages}
              className="p-1.5 rounded-lg border border-line bg-paper hover:bg-ink hover:text-paper disabled:opacity-30 disabled:hover:bg-paper disabled:hover:text-ink transition-colors cursor-pointer"
              title="Halaman Selanjutnya (→)"
            >
              <FiChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Center: Zoom Controls */}
          <div className="flex items-center gap-1.5 bg-paper border border-line/80 px-2 py-1 rounded-xl shadow-xs">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoomScale <= 0.4}
              className="p-1 rounded-md hover:bg-line/40 disabled:opacity-30 transition-colors cursor-pointer"
              title="Perkecil (-)"
            >
              <FiZoomOut className="h-4 w-4" />
            </button>

            <span className="w-14 text-center font-mono text-xs text-ink font-bold select-none">
              {displayZoomPercent}
            </span>

            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoomScale >= 2.5}
              className="p-1 rounded-md hover:bg-line/40 disabled:opacity-30 transition-colors cursor-pointer"
              title="Perbesar (+)"
            >
              <FiZoomIn className="h-4 w-4" />
            </button>

            <div className="h-4 w-px bg-line mx-0.5" />

            <button
              type="button"
              onClick={handleToggleFitWidth}
              className={cn(
                "px-2 py-0.5 rounded-md border text-[11px] font-bold transition-colors cursor-pointer",
                isFitWidth
                  ? "bg-ink text-paper border-ink"
                  : "bg-paper text-ink border-line hover:bg-ink/10"
              )}
              title="Sesuaikan Lebar Layar"
            >
              Fit Lebar
            </button>
          </div>

          {/* Right: Rotation & View Mode */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleRotate}
              className="p-1.5 rounded-lg border border-line bg-paper hover:bg-ink hover:text-paper transition-colors cursor-pointer flex items-center gap-1 text-xs"
              title="Putar 90° (R)"
            >
              <FiRotateCw className="h-4 w-4" />
              {rotation > 0 && <span>{rotation}°</span>}
            </button>

            <div className="h-4 w-px bg-line mx-0.5" />

            <button
              type="button"
              onClick={() => setViewMode((prev) => (prev === "single" ? "continuous" : "single"))}
              className={cn(
                "px-2.5 py-1 rounded-lg border text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5",
                viewMode === "continuous"
                  ? "bg-ink text-paper border-ink"
                  : "bg-paper text-ink border-line hover:bg-ink hover:text-paper"
              )}
              title={viewMode === "continuous" ? "Mode Gulir Kontinu" : "Mode Halaman Tunggal"}
            >
              {viewMode === "continuous" ? (
                <>
                  <FiLayers className="h-4 w-4" />
                  <span>Kontinu</span>
                </>
              ) : (
                <>
                  <FiGrid className="h-4 w-4" />
                  <span>Tunggal</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Modal Canvas Body (Scrollable container for high-DPI PDF pages) */}
        <div
          ref={containerRefCallback}
          onScroll={handleScroll}
          className="flex-1 w-full bg-paper/70 rounded-xl border-2 border-line overflow-auto p-2 sm:p-4 shadow-inner custom-scrollbar relative min-h-0"
        >
          {objectUrl ? (
            <Document
              file={objectUrl}
              onLoadSuccess={({ numPages: n }) => {
                setNumPages(n)
                if (currentPage > n) setCurrentPage(1)
              }}
              loading={
                <div className="flex flex-col items-center justify-center h-64 space-y-3">
                  <div className="bg-line/30 h-48 w-64 animate-pulse rounded-xl" />
                  <p className="scrawl text-muted text-sm">Menyiapkan preview PDF ultra-tajam…</p>
                </div>
              }
              error={<p className="text-red text-xs font-semibold p-4">Gagal membaca file PDF</p>}
            >
              {viewMode === "single" ? (
                /* Single Page View */
                <div className="min-w-full w-max flex flex-col items-center justify-center py-2 mx-auto min-h-full">
                  <div
                    id={`pdf-page-${currentPage}`}
                    className="border-2 border-line/80 shadow-lift rounded-lg overflow-hidden bg-white my-auto transition-transform duration-150 relative shrink-0"
                    style={{ width: renderWidth }}
                  >
                    <Page
                      pageNumber={currentPage}
                      width={renderWidth}
                      rotate={rotation}
                      devicePixelRatio={
                        typeof window !== "undefined"
                          ? Math.max(window.devicePixelRatio || 1, 2.5)
                          : 2.5
                      }
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      loading={null}
                    />
                  </div>
                </div>
              ) : (
                /* Continuous Vertical Scroll View */
                <div className="min-w-full w-max flex flex-col items-center space-y-5 py-2 mx-auto">
                  {Array.from({ length: numPages }, (_, i) => (
                    <div
                      key={i}
                      id={`pdf-page-${i + 1}`}
                      className="border-2 border-line/80 shadow-lift rounded-lg overflow-hidden bg-white transition-transform duration-150 relative group shrink-0"
                      style={{ width: renderWidth }}
                    >
                      <Page
                        pageNumber={i + 1}
                        width={renderWidth}
                        rotate={rotation}
                        devicePixelRatio={
                          typeof window !== "undefined"
                            ? Math.max(window.devicePixelRatio || 1, 2.5)
                            : 2.5
                        }
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        loading={null}
                      />
                      {numPages > 1 && (
                        <div className="absolute top-2.5 right-2.5 bg-ink/80 backdrop-blur text-paper text-[10px] font-mono font-bold px-2 py-0.5 rounded-md opacity-80 group-hover:opacity-100 transition-opacity shadow-xs">
                          {i + 1} / {numPages}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Document>
          ) : (
            <div className="h-full flex flex-col items-center justify-center space-y-2 p-8 text-center">
              <div className="bg-line/30 h-20 w-20 animate-pulse rounded-full" />
              <p className="scrawl text-muted text-base">Menyiapkan preview PDF…</p>
            </div>
          )}
        </div>

        {/* Mobile Floating Bottom Toolbar (Sleek pill bar on small mobile screens) */}
        <div className="sm:hidden flex items-center justify-between gap-1.5 bg-ink text-paper border-2 border-paper/40 rounded-2xl px-3 py-2 shadow-lift shrink-0 w-full">
          {/* Page prev/next */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-1 rounded bg-paper/20 hover:bg-paper/40 disabled:opacity-30 cursor-pointer"
            >
              <FiChevronLeft className="h-4 w-4 text-paper" />
            </button>
            <span className="text-[11px] font-bold font-mono px-1">
              {currentPage}/{numPages || 1}
            </span>
            <button
              type="button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= numPages}
              className="p-1 rounded bg-paper/20 hover:bg-paper/40 disabled:opacity-30 cursor-pointer"
            >
              <FiChevronRight className="h-4 w-4 text-paper" />
            </button>
          </div>

          <div className="h-4 w-px bg-paper/30" />

          {/* Zoom controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoomScale <= 0.4}
              className="p-1 rounded bg-paper/20 hover:bg-paper/40 disabled:opacity-30 cursor-pointer"
            >
              <FiZoomOut className="h-4 w-4 text-paper" />
            </button>
            <span className="text-[10px] font-mono font-bold w-9 text-center">
              {displayZoomPercent}
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoomScale >= 2.5}
              className="p-1 rounded bg-paper/20 hover:bg-paper/40 disabled:opacity-30 cursor-pointer"
            >
              <FiZoomIn className="h-4 w-4 text-paper" />
            </button>
          </div>

          <div className="h-4 w-px bg-paper/30" />

          {/* Rotate & View mode */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleToggleFitWidth}
              className={cn(
                "p-1 rounded cursor-pointer",
                isFitWidth ? "bg-yellow text-ink font-bold" : "bg-paper/20 text-paper"
              )}
              title="Fit Lebar"
            >
              <FiMaximize2 className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={handleRotate}
              className="p-1 rounded bg-paper/20 hover:bg-paper/40 cursor-pointer"
              title="Putar 90°"
            >
              <FiRotateCw className="h-4 w-4 text-paper" />
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
