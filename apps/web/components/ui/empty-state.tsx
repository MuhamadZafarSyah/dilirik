import Link from "next/link"

/** Empty state scrapbook — selalu mengarahkan aksi berikutnya (Prinsip UX #1). */
export function EmptyState({ title, ctaLabel, ctaHref, note }: {
  title: string
  ctaLabel: string
  ctaHref: string
  note?: string
}) {
  return (
    <div className="card bg-panel border-line relative mx-auto max-w-md rotate-[-1deg] rounded-lg border-2 border-dashed p-10 text-center">
      <span className="tape" aria-hidden />
      <p className="hand text-2xl">{title}</p>
      {note ? <p className="text-muted mt-2 text-sm">{note}</p> : null}
      <Link
        href={ctaHref}
        className="label bg-ink text-paper mt-6 inline-block rounded-md px-5 py-2.5 text-sm font-bold transition-transform hover:rotate-[-2deg]"
      >
        {ctaLabel} →
      </Link>
    </div>
  )
}
