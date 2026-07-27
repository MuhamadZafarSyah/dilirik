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
      <DialogContent className="max-w-[50vw] sm:max-w-[50vw] w-[50vw] h-[90vh] flex flex-col p-2.5 md:p-3.5 gap-2 ">
        {/* Compact Single-Line Header */}
        <DialogHeader className="flex flex-row items-center justify-between gap-3 pr-8 shrink-0 space-y-0">
          <DialogTitle className="flex items-center gap-2 text-lg md:text-xl text-ink min-w-0">
            <FiFileText className="h-5 w-5 text-blue shrink-0" />
            <span className="truncate">{title}</span>
          </DialogTitle>
          <div className="flex items-center gap-2 mr-4 shrink-0">
            {objectUrl && (
              <a
                href={objectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold label bg-paper border border-line px-2.5 py-1 rounded-md hover:bg-ink hover:text-paper transition-colors"
              >
                <FiExternalLink className="h-3.5 w-3.5" />
                Tab Baru
              </a>
            )}
            <Button variant="primary" size="sm" icon={<FiDownload />} onClick={handleDownload}>
              Unduh
            </Button>
          </div>
        </DialogHeader>

        {/* Modal Body: Maximized Embed Container */}
        <div className="flex-1 w-full bg-paper rounded-xl border-2 border-line overflow-hidden relative shadow-inner">
          {objectUrl ? (
            <embed
              src={objectUrl}
              type="application/pdf"
              className="w-full h-full border-none"
            />
          ) : (
            <div className="flex-1 h-full flex flex-col items-center justify-center space-y-2 p-8 text-center">
              <div className="bg-line/30 h-24 w-24 animate-pulse rounded-full" />
              <p className="scrawl text-muted text-base">Menyiapkan preview PDF native…</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

