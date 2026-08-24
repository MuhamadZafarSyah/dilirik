"use client"

import { motion } from "framer-motion"
import { FiAlertTriangle, FiBookmark, FiClock, FiExternalLink, FiEyeOff, FiZap } from "react-icons/fi"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"

export type JobSourceView = {
  providerId: string
  displayName: string
  url: string
  applyUrl: string
  postedAt: string | null
}

export type JobMatchView = {
  id: string
  rank: number
  isTopPick: boolean
  estimatedScore: number
  title: string
  company: string
  location: string | null
  remoteType: string | null
  salaryMin: number | null
  salaryMax: number | null
  currency: string | null
  salaryPeriod: string | null
  reasonText: string | null
  cautionText: string | null
  matchedSkills: string[]
  missingSkills: string[]
  sources: JobSourceView[]
  primarySource: string
  postedAt: string | null
  postedHoursAgo: number | null
  indexedHoursAgo: number
  isLikelyStale: boolean
  status: string
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 280, damping: 22 } },
}

function formatAge(hours: number | null): string {
  if (hours === null) return "tanggal tidak diketahui"
  if (hours < 1) return "kurang dari 1 jam lalu"
  if (hours < 48) return `${hours} jam lalu`
  return `${Math.round(hours / 24)} hari lalu`
}

function formatSalary(match: JobMatchView): string | null {
  if (!match.salaryMin && !match.salaryMax) return null
  const currency = match.currency ?? "IDR"
  const range = [match.salaryMin, match.salaryMax]
    .filter((value): value is number => typeof value === "number")
    .map((value) => value.toLocaleString("id-ID"))
    .join(" \u2013 ")
  return `${currency} ${range}${match.salaryPeriod ? ` / ${match.salaryPeriod}` : ""}`
}

export function JobMatchCard({
  match,
  onSave,
  onDismiss,
  onAnalyze,
  busy,
}: {
  match: JobMatchView
  onSave: (id: string) => void
  onDismiss: (id: string) => void
  onAnalyze: (id: string) => void
  busy?: boolean
}) {
  const { t } = useI18n()
  const salary = formatSalary(match)
  const isDismissed = match.status === "DISMISSED"

  return (
    <motion.div variants={itemVariants}>
      <Card
        tape={match.isTopPick ? "yellow" : "blue"}
        className={cn("p-5 space-y-4", isDismissed && "opacity-50")}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h3 className="hand text-2xl font-bold text-ink">{match.title}</h3>
            <p className="scrawl text-muted text-lg">
              {match.company}
              {match.location ? ` \u00b7 ${match.location}` : ""}
              {match.remoteType ? ` \u00b7 ${match.remoteType}` : ""}
            </p>
          </div>

          {/* Angka ini perkiraan dari aturan, bukan hasil analisis penuh. Label
              dan tooltip-nya sengaja mengatakan itu, supaya tidak dibaca sebagai
              janji peluang diterima. */}
          <div className="text-right shrink-0" title={t("discovery.estimatedMatchDisclaimer")}>
            <div className="label text-muted">{t("discovery.estimatedMatch")}</div>
            <div className="hand text-3xl font-bold text-ink">{match.estimatedScore}</div>
          </div>
        </div>

        {/* Transparansi sumber & kesegaran: dua-duanya wajib tampil di setiap kartu. */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          <span className="inline-flex items-center gap-1">
            <FiExternalLink aria-hidden />
            {t("discovery.source")}: {match.sources[0]?.displayName ?? match.primarySource}
          </span>
          <span className="inline-flex items-center gap-1">
            <FiClock aria-hidden />
            {t("discovery.postedAgo")} {formatAge(match.postedHoursAgo)}
          </span>
          <span>
            {t("discovery.indexedAgo")} {formatAge(match.indexedHoursAgo)}
          </span>
          {match.sources.length > 1 ? <span>+{match.sources.length - 1} sumber lain</span> : null}
        </div>

        {match.isLikelyStale ? (
          <p className="text-xs text-yellow inline-flex items-center gap-1">
            <FiAlertTriangle aria-hidden />
            {t("discovery.maybeClosed")}
          </p>
        ) : null}

        {match.reasonText ? (
          <div className="rounded-md border border-line bg-panel/60 p-3 space-y-2">
            <div className="label text-muted">{t("discovery.whyMatch")}</div>
            <p className="text-sm text-ink">{match.reasonText}</p>
            {match.cautionText ? (
              <p className="text-sm text-yellow">
                {t("discovery.caution")}: {match.cautionText}
              </p>
            ) : null}
          </div>
        ) : null}

        {salary ? <p className="text-sm text-ink">{salary}</p> : null}

        {match.matchedSkills.length > 0 || match.missingSkills.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {match.matchedSkills.slice(0, 6).map((skill) => (
              <span
                key={`m-${skill}`}
                className="rounded-full border border-line px-2 py-0.5 text-xs text-ink shadow-xs"
              >
                {skill}
              </span>
            ))}
            {match.missingSkills.slice(0, 4).map((skill) => (
              <span
                key={`x-${skill}`}
                className="rounded-full border border-line px-2 py-0.5 text-xs text-muted"
              >
                {skill}?
              </span>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {/* Apply selalu ke sumber aslinya. Dilirik tidak pernah menyisipkan diri
              di antara pelamar dan perusahaan. */}
          <a href={match.sources[0]?.applyUrl ?? "#"} target="_blank" rel="noopener noreferrer">
            <Button variant="primary" size="sm" icon={<FiExternalLink />}>
              {t("discovery.applyAt")}
            </Button>
          </a>
          <Button
            variant="outline"
            size="sm"
            icon={<FiZap />}
            onClick={() => onAnalyze(match.id)}
            disabled={busy}
          >
            {t("analyze")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<FiBookmark />}
            onClick={() => onSave(match.id)}
            disabled={busy || match.status === "SAVED"}
          >
            {t("saveToTracker")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<FiEyeOff />}
            onClick={() => onDismiss(match.id)}
            disabled={busy || isDismissed}
          >
            {t("discovery.dismiss")}
          </Button>
        </div>
      </Card>
    </motion.div>
  )
}
