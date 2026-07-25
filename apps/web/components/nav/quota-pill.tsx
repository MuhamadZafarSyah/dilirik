"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { FiZap, FiAlertTriangle } from "react-icons/fi"
import { useQuery } from "@tanstack/react-query"
import { api, type QuotaInfo } from "@/lib/api"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"

/** Sisa kuota SELALU terlihat di header dengan animasi (Flow E). Di-refresh otomatis via invalidasi ["quota"] setelah analisis baru. */
export function QuotaPill() {
  const { t } = useI18n()

  const quotaQuery = useQuery({
    queryKey: ["quota"],
    queryFn: async () => {
      const { data } = await api.get<QuotaInfo>("/api/analyze/quota")
      return data
    },
  })
  const quota = quotaQuery.data ?? null

  if (!quota) return null
  const isUnlimited = quota.quota === null
  const remaining = quota.remaining ?? 0
  const total = quota.quota ?? 10
  const exhausted = !isUnlimited && remaining <= 0
  const percent = isUnlimited ? 100 : Math.round((remaining / total) * 100)

  return (
    <motion.div
      whileHover={{ scale: 1.03, rotate: -1 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
    >
      <Link
        href={exhausted ? "/pricing" : "/app/analyze"}
        className={cn(
          "label relative inline-flex items-center gap-2 rounded-full border-2 px-3.5 py-1.5 text-xs font-bold shadow-paper backdrop-blur-xs transition-colors",
          exhausted
            ? "border-red/80 bg-red/15 text-red hover:bg-red/25"
            : "border-line bg-panel/90 text-ink hover:border-ink"
        )}
        title={exhausted ? t("quotaExhausted") : `${remaining} ${t("quotaLeft")}`}
      >
        {exhausted ? (
          <FiAlertTriangle className="h-4 w-4 animate-bounce text-red" />
        ) : (
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green" />
          </span>
        )}

        <span>
          {isUnlimited ? (
            <span className="flex items-center gap-1">
              <FiZap className="h-3.5 w-3.5 text-yellow fill-yellow" /> ♾︎ Pro
            </span>
          ) : (
            <span>
              {remaining}/{total} {t("quotaLeft")}
            </span>
          )}
        </span>

        {!isUnlimited && (
          <div className="h-1.5 w-12 rounded-full bg-line/50 overflow-hidden ml-1">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percent}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={cn(
                "h-full rounded-full",
                percent > 40 ? "bg-green" : percent > 15 ? "bg-yellow" : "bg-red"
              )}
            />
          </div>
        )}
      </Link>
    </motion.div>
  )
}
