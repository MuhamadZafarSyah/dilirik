"use client"

import {
  FiAlertTriangle,
  FiBookmark,
  FiCheckCircle,
  FiExternalLink,
  FiEyeOff,
  FiMapPin,
  FiZap,
} from "react-icons/fi"
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

function formatAge(hours: number | null): string {
  if (hours === null) return ""
  if (hours < 1) return "Baru saja"
  if (hours < 24) return `${hours}j lalu`
  const days = Math.round(hours / 24)
  return `${days}h lalu`
}

function formatSalary(match: JobMatchView): string | null {
  if (!match.salaryMin && !match.salaryMax) return null
  const currency = match.currency ?? "IDR"
  const range = [match.salaryMin, match.salaryMax]
    .filter((value): value is number => typeof value === "number")
    .map((value) => value.toLocaleString("id-ID"))
    .join(" – ")
  return `${currency} ${range}${match.salaryPeriod ? `/${match.salaryPeriod}` : ""}`
}

export function JobMatchCard({
  match,
  onSave,
  onUnsave,
  onDismiss,
  onAnalyze,
  busy,
}: {
  match: JobMatchView
  onSave: (id: string) => void
  onUnsave?: (id: string) => void
  onDismiss: (id: string) => void
  onAnalyze: (id: string) => void
  busy?: boolean
}) {
  const { t } = useI18n()
  const salary = formatSalary(match)
  const isDismissed = match.status === "DISMISSED"
  const isSaved = match.status === "SAVED"

  const score = match.estimatedScore
  const scoreBadgeColor =
    score >= 80
      ? "bg-green/10 text-green border-green/30"
      : score >= 60
        ? "bg-blue/10 text-blue border-blue/30"
        : "bg-paper text-muted border-line"

  const ageText = formatAge(match.postedHoursAgo)

  return (
    <div
      className={cn(
        "group relative rounded-2xl border transition-all duration-150 p-5 sm:p-6 bg-panel shadow-xs hover:border-ink/40",
        match.isTopPick ? "border-yellow/70 bg-gradient-to-br from-panel to-paper/40" : "border-line",
        isDismissed && "opacity-40 grayscale hover:grayscale-0",
      )}
    >
      {/* Top Header Row */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            {match.isTopPick && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-yellow text-ink border border-ink/20 text-xs font-bold">
                ★ {t("discovery.topPicks")} #{match.rank}
              </span>
            )}
            <span className="text-muted font-medium">
              {match.sources[0]?.displayName ?? match.primarySource}
            </span>
            {ageText && (
              <>
                <span className="text-line">•</span>
                <span className="text-muted font-normal">{ageText}</span>
              </>
            )}
            {salary && (
              <>
                <span className="text-line">•</span>
                <span className="text-ink font-semibold">{salary}</span>
              </>
            )}
          </div>

          <h3 className="text-lg sm:text-xl font-bold text-ink leading-snug group-hover:text-primary transition-colors">
            {match.title}
          </h3>

          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-muted">
            <span className="font-semibold text-ink">{match.company}</span>
            {match.location && (
              <span className="inline-flex items-center gap-1">
                <FiMapPin className="w-3.5 h-3.5 shrink-0 opacity-70" />
                {match.location}
              </span>
            )}
            {match.remoteType && (
              <span className="px-2 py-0.5 rounded-md bg-paper border border-line text-xs font-medium text-ink uppercase tracking-wide">
                {match.remoteType}
              </span>
            )}
          </div>
        </div>

        {/* Minimal Score Indicator */}
        <div
          className={cn(
            "flex flex-col items-center justify-center min-w-[58px] px-2.5 py-1.5 rounded-xl border shrink-0 text-center",
            scoreBadgeColor,
          )}
          title={t("discovery.estimatedMatchDisclaimer")}
        >
          <span className="text-base sm:text-lg font-extrabold leading-none tracking-tight">
            {match.estimatedScore}%
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider opacity-75 mt-0.5">
            Cocok
          </span>
        </div>
      </div>

      {/* Clean AI Insight */}
      {match.reasonText && (
        <div className="mt-3.5 pt-3 border-t border-line/60 space-y-1.5 text-xs sm:text-sm text-ink leading-relaxed">
          <p className="flex items-start gap-2">
            <span className="text-yellow shrink-0 mt-0.5">💡</span>
            <span>{match.reasonText}</span>
          </p>
          {match.cautionText && (
            <p className="flex items-start gap-2 text-muted">
              <span className="text-red shrink-0 mt-0.5">⚠️</span>
              <span>{match.cautionText}</span>
            </p>
          )}
        </div>
      )}

      {/* Skill Pills */}
      {match.matchedSkills.length > 0 && (
        <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
          {match.matchedSkills.slice(0, 5).map((skill) => (
            <span
              key={`m-${skill}`}
              className="inline-flex items-center gap-1 rounded-md bg-paper border border-line px-2 py-0.5 text-xs text-ink/90 font-medium"
            >
              <FiCheckCircle className="text-green w-3 h-3 shrink-0" />
              {skill}
            </span>
          ))}
          {match.missingSkills.slice(0, 3).map((skill) => (
            <span
              key={`x-${skill}`}
              className="rounded-md border border-dashed border-line px-2 py-0.5 text-xs text-muted"
            >
              {skill}
            </span>
          ))}
        </div>
      )}

      {/* Bottom Actions Row */}
      <div className="mt-4 pt-3.5 border-t border-line/50 flex flex-wrap items-center justify-between gap-3">
        <div>
          {match.isLikelyStale ? (
            <span className="inline-flex items-center gap-1 text-xs text-red font-medium">
              <FiAlertTriangle className="w-3.5 h-3.5" />
              {t("discovery.maybeClosed")}
            </span>
          ) : (
            <span className="text-xs text-muted">
              Sumber: {match.primarySource}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (isSaved && onUnsave) {
                onUnsave(match.id)
              } else {
                onSave(match.id)
              }
            }}
            disabled={busy}
            title={isSaved ? "Klik untuk menghapus dari tracker" : "Simpan ke tracker"}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer",
              isSaved
                ? "bg-blue text-paper border-blue hover:bg-blue/90"
                : "bg-paper text-ink border-line hover:border-ink/60",
            )}
          >
            <FiBookmark className={cn("w-3.5 h-3.5", isSaved && "fill-current")} />
            <span>{isSaved ? "Tersimpan" : "Simpan"}</span>
          </button>

          <button
            type="button"
            onClick={() => onAnalyze(match.id)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line bg-paper text-ink hover:border-ink/60 text-xs font-semibold transition-all cursor-pointer"
          >
            <FiZap className="w-3.5 h-3.5 text-yellow" />
            <span>Analisis</span>
          </button>

          <a
            href={match.sources[0]?.applyUrl ?? match.sources[0]?.url ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-ink text-paper text-xs font-bold shadow-xs hover:opacity-90 transition-all"
          >
            <span>Lamar</span>
            <FiExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            type="button"
            onClick={() => onDismiss(match.id)}
            disabled={busy || isDismissed}
            title="Sembunyikan"
            className="p-1.5 rounded-lg text-muted hover:text-red hover:bg-red/10 transition-colors cursor-pointer"
          >
            <FiEyeOff className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

