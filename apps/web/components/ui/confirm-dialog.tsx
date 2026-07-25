"use client"

import { useState, type ReactNode } from "react"
import { FiAlertTriangle } from "react-icons/fi"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/modal"

type ConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** Dipanggil saat user menekan tombol konfirmasi. Boleh async — dialog menampilkan loading dan menutup setelah selesai. */
  onConfirm: () => void | Promise<void>
}

/**
 * Dialog konfirmasi destruktif (pengganti window.confirm) — memakai modal Radix + gaya scrapbook Dilirik.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Ya, hapus",
  cancelLabel = "Batal",
  onConfirm,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false)

  async function handleConfirm() {
    setBusy(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!busy) onOpenChange(next)
      }}
    >
      <DialogContent className="max-w-md sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FiAlertTriangle className="text-red h-7 w-7 shrink-0" />
            {title}
          </DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant="danger" onClick={handleConfirm} isLoading={busy} disabled={busy}>
            {busy ? "Memproses…" : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
