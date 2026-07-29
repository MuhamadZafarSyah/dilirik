import Link from "next/link"
import type { ReactNode } from "react"

import { formatLegalDate } from "@/lib/legal/meta"

type RelatedLink = {
  href: string
  label: string
}

type LegalShellProps = {
  title: string
  summary: string
  lastUpdatedIso: string
  related: RelatedLink
  children: ReactNode
}

/**
 * Kerangka halaman legal.
 *
 * Sengaja tanpa kartu dan tanpa rotasi: dokumen yang harus dibaca butuh satu
 * kolom teks yang tenang, dan pemisah antarpasal cukup diwakili garis tipis.
 * Aksen scrapbook tetap ada lewat tekstur kertas dan tipografi tangan pada
 * judul, jadi halaman ini masih terasa satu keluarga dengan sisa aplikasi.
 */
export function LegalShell({
  title,
  summary,
  lastUpdatedIso,
  related,
  children,
}: LegalShellProps) {
  return (
    <main className="paper-texture min-h-screen">
      <div className="shell mx-auto max-w-3xl py-10 sm:py-16">
        <header className="space-y-7 border-b border-line pb-9">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/" className="hand text-2xl text-ink">
              Dilirik
            </Link>
            <Link
              href="/"
              className="text-sm text-muted transition-colors hover:text-ink"
            >
              Kembali ke beranda
            </Link>
          </div>

          <div className="space-y-4">
            <h1 className="hand text-4xl leading-tight text-ink sm:text-5xl">
              {title}
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-muted">
              {summary}
            </p>
            <p className="text-xs text-muted">
              Terakhir diperbarui {formatLegalDate(lastUpdatedIso)}
            </p>
          </div>
        </header>

        <div className="divide-y divide-line">{children}</div>

        <footer className="mt-10 border-t border-line pt-6">
          <Link
            href={related.href}
            className="text-sm text-ink underline decoration-line decoration-2 underline-offset-4 transition-colors hover:decoration-ink"
          >
            {related.label}
          </Link>
        </footer>
      </div>
    </main>
  )
}
