"use client"

import { useState } from "react"
import { FiDownload } from "react-icons/fi"

type Props = {
  rawText: string
  title: string
  version: number
  language: string
}

/**
 * Tombol "Download PDF": generate PDF dari rawText (teks CV utuh + revisi
 * yang sudah diterapkan) sepenuhnya di browser via @react-pdf/renderer
 * (dynamic import — tidak membebani bundle awal, tidak menyentuh
 * server/kuota, dan tidak perlu storage).
 */
export function DownloadCvButton({ rawText, title, version, language }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  async function download() {
    setBusy(true)
    setError(false)
    try {
      const [{ pdf }, { CvDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./cv-document"),
      ])
      const blob = await pdf(<CvDocument rawText={rawText} title={title} language={language} />).toBlob()
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "cv"
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${slug}-v${version}-dilirik.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        onClick={download}
        disabled={busy}
        className="label bg-green text-paper inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-bold transition-transform hover:rotate-[-1deg] disabled:cursor-wait disabled:opacity-60"
      >
        <FiDownload aria-hidden className="size-4" />
        {busy ? "Menyiapkan…" : "Download PDF"}
      </button>
      {error ? <span className="text-red mt-1 text-xs">Gagal membuat PDF, coba lagi.</span> : null}
    </span>
  )
}
