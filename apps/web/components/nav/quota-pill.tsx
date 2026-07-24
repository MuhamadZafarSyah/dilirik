"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { api, type QuotaInfo } from "@/lib/api"
import { useI18n } from "@/lib/i18n"

/** Sisa kuota SELALU terlihat di header (Flow E, PRD §11). */
export function QuotaPill() {
  const { t } = useI18n()
  const [quota, setQuota] = useState<QuotaInfo | null>(null)

  useEffect(() => {
    api.get<QuotaInfo>("/api/analyze/quota").then((r) => setQuota(r.data)).catch(() => {})
  }, [])

  if (!quota) return null
  const isUnlimited = quota.quota === null
  const exhausted = !isUnlimited && (quota.remaining ?? 0) <= 0
  return (
    <Link
      href={exhausted ? "/pricing" : "/app/analyze"}
      className={`label rounded-sm border-2 px-3 py-1 text-xs font-bold uppercase tracking-wide ${
        exhausted ? "border-red text-red bg-red/10" : "border-line bg-panel text-ink"
      }`}
      title={exhausted ? t("quotaExhausted") : t("quotaLeft")}
    >
      {isUnlimited ? `♾︎ ${t("unlimited")}` : `${quota.remaining}/${quota.quota} ${t("quotaLeft")}`}
    </Link>
  )
}
