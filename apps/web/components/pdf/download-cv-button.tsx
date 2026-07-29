"use client"

import { useState } from "react"
import { track } from "@/lib/analytics/track"
import { Button } from "@/components/ui/button"

type Props = {
  rawText: string
  title: string
  version: number
  language: string
}

/**
 * Download PDF hasil render TEMPLATE DILIRIK dari rawText (fidelity teks penuh).
 * Catatan jujur (Fase 1a): PDF upload-an user tidak menyimpan struktur desain,
 * jadi tombol ini TIDAK mengklaim mempertahankan desain asli — untuk desain
 * asli, pakai jalur DOCX native atau salin teks revisi ke file sumber.
 */
export function DownloadCvButton({ rawText, title, version, language }: Props) {
  const [busy, setBusy] = useState(false)

  async function download() {
    setBusy(true)
    try {
      const [{ pdf }, { CvDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./cv-document"),
      ])
      const blob = await pdf(
        <CvDocument rawText={rawText} title={title} language={language} />,
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "cv"
      a.href = url
      a.download = `${slug}-v${version}-dilirik.pdf`
      a.click()
      URL.revokeObjectURL(url)
      track("export_downloaded", { format: "pdf", module: "cv" })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button onClick={download} disabled={busy}>
      {busy ? "Menyiapkan PDF…" : "⬇ PDF (template Dilirik)"}
    </Button>
  )
}
