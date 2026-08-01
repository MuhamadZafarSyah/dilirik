"use client"

import { useEffect, useState } from "react"
import { FiDownload, FiExternalLink, FiFileText } from "react-icons/fi"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/modal"

export function PdfNativeModal({
  file,
  title = "Preview PDF Native",
  isOpen,
  onClose,
}: {
  file: Blob | null
  title?: string
  isOpen: boolean
  onClose: () => void
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)

  useEffect(() => {
    if (file && isOpen) {
      const url = URL.createObjectURL(file)
      setObjectUrl(url)
      return () => {
        URL.revokeObjectURL(url)
        setObjectUrl(null)
      }
    }
  }, [file, isOpen])

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
          </DialogTitle>
          {/* <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
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
          </div> */}
        </DialogHeader>

        {/* Modal Body: Maximized Embed Container */}
        <div className="flex-1 w-full bg-paper rounded-xl border-2 border-line overflow-hidden relative shadow-inner">
          {objectUrl ? (
            <iframe
              src={objectUrl}
              title={title}
              className="w-full h-full border-none"
            />
          ) : (
            <div className="flex-1 h-full flex flex-col items-center justify-center space-y-2 p-8 text-center">
              <div className="bg-line/30 h-20 w-20 sm:h-24 sm:w-24 animate-pulse rounded-full" />
              <p className="scrawl text-muted text-base">Menyiapkan preview PDF native…</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

