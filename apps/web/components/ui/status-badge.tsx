import { APPLICATION_STATUS_LABELS, type ApplicationStatus } from "@dilirik/shared"

const toneByStatus: Record<ApplicationStatus, string> = {
  DISIMPAN: "bg-line/50 text-ink",
  DILAMAR: "bg-blue/20 text-blue",
  SCREENING: "bg-yellow/30 text-ink",
  INTERVIEW: "bg-blue/30 text-blue",
  OFFER: "bg-green/25 text-green",
  DITOLAK: "bg-red/20 text-red",
}

export function StatusBadge({ status, lang = "id" }: { status: ApplicationStatus; lang?: "id" | "en" }) {
  return (
    <span className={`label inline-block rounded-sm px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${toneByStatus[status]}`}>
      {APPLICATION_STATUS_LABELS[status][lang]}
    </span>
  )
}
