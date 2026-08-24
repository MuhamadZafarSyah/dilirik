"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Skeleton } from "boneyard-js/react"
import { motion } from "framer-motion"
import { useState } from "react"
import { FiBell, FiInfo, FiSearch } from "react-icons/fi"
import { JobMatchCard, type JobMatchView } from "@/components/discovery/job-match-card"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { useToast } from "@/components/ui/toast"
import { api, errorMessage } from "@/lib/api"
import { useI18n } from "@/lib/i18n"

/**
 * Halaman Cari Lowongan (PRD Cari Lowongan §6 & §7).
 *
 * Prinsip UI yang dipegang di halaman ini:
 * - 5 "Wajib Coba" di atas, sisanya di bawah — bukan daftar panjang tanpa arah.
 * - Setiap kartu menunjukkan sumber dan umur data. Kesegaran ditunjukkan, tidak diklaim.
 * - Kosong lebih baik daripada sampah: kalau tidak ada yang cocok, katakan apa
 *   adanya dan tawarkan notifikasi, jangan diisi hasil asal-asalan.
 */

type CvListItem = { id: string; title: string; version: number }

type SearchProfile = {
  id: string
  roles: string[]
  skills: string[]
  locations: string[]
  remotePref: string
  seniority: string | null
}

type SearchResponse = {
  runId: string
  status: string
  searchProfile: SearchProfile
  topPicks: JobMatchView[]
  otherCandidates: JobMatchView[]
  emptyState?: {
    message: string
    detail: string
    canRequestAlert: boolean
    pendingQueryId: string | null
  }
  meta: {
    candidateCount: number
    indexAgeHours: number | null
    indexIsPartial: boolean
    unavailableSources: string[]
    relaxedFilters: string[]
    quotaRemaining: number | null
    curationNote: string | null
  }
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 280, damping: 22 } },
}

export default function DiscoveryPage() {
  const { t } = useI18n()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [selectedCvId, setSelectedCvId] = useState<string>("")
  const [result, setResult] = useState<SearchResponse | null>(null)

  const cvsQuery = useQuery({
    queryKey: ["cvs"],
    queryFn: async () => {
      const response = await api.get<{ cvs: CvListItem[] }>("/api/cv")
      return response.data.cvs
    },
  })

  const statusQuery = useQuery({
    queryKey: ["discovery-status"],
    queryFn: async () => {
      const response = await api.get<{
        indexJobCount: number
        indexAgeHours: number | null
        quota: { quota: number | null; remaining: number | null }
      }>("/api/discovery/status")
      return response.data
    },
  })

  const searchMutation = useMutation({
    mutationFn: async (cvId: string) => {
      const response = await api.post<SearchResponse>("/api/discovery/search", { cvId })
      return response.data
    },
    onSuccess: (data) => {
      setResult(data)
      queryClient.invalidateQueries({ queryKey: ["discovery-status"] })
    },
    onError: (error) => toast(errorMessage(error), "error"),
  })

  const actionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "save" | "dismiss" | "analyze" }) => {
      const body = action === "dismiss" ? { reason: "NOT_RELEVANT" } : {}
      const response = await api.post(`/api/discovery/matches/${id}/${action}`, body)
      return { action, data: response.data as Record<string, unknown> }
    },
    onSuccess: ({ action, data }) => {
      if (action === "analyze") {
        toast(
          "Lowongan disiapkan untuk analisis. Analisis penuh memakai kuota analisis.",
          "success",
        )
      } else {
        toast(action === "save" ? "Disimpan ke tracker" : "Disembunyikan", "success")
      }

      const updated = (data.match ?? null) as JobMatchView | null
      if (updated) {
        setResult((current) =>
          current
            ? {
              ...current,
              topPicks: current.topPicks.map((item) =>
                item.id === updated.id ? { ...item, status: updated.status } : item,
              ),
              otherCandidates: current.otherCandidates.map((item) =>
                item.id === updated.id ? { ...item, status: updated.status } : item,
              ),
            }
            : current,
        )
      }
    },
    onError: (error) => toast(errorMessage(error), "error"),
  })

  const alertMutation = useMutation({
    mutationFn: async (pendingQueryId: string) => {
      await api.post("/api/discovery/alerts", { pendingQueryId })
    },
    onSuccess: () => toast("Kami kabari kalau ada lowongan yang cocok", "success"),
    onError: (error) => toast(errorMessage(error), "error"),
  })

  const cvs = cvsQuery.data ?? []
  const activeCvId = selectedCvId || cvs[0]?.id || ""
  const quotaRemaining = statusQuery.data?.quota.remaining ?? null

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-shell mx-auto space-y-8 py-8"
    >
      <motion.header variants={itemVariants} className="space-y-2">
        <h1 className="hand text-4xl sm:text-5xl font-bold text-ink">{t("discovery.title")}</h1>
        <p className="scrawl text-muted text-xl">{t("discovery.subtitle")}</p>
      </motion.header>

      <motion.div variants={itemVariants}>
        <Card tape="blue" className="p-5 space-y-4">
          <div className="label text-muted">{t("discovery.searchProfile")}</div>

          {cvsQuery.isLoading ? (
            <Skeleton loading={true} animate="shimmer" fallback={<div className="h-10" />}>
              <div className="h-10" />
            </Skeleton>
          ) : cvs.length === 0 ? (
            <EmptyState
              title={t("emptyCvTitle")}
              note="Fitur ini membaca CV kamu untuk menyusun profil pencarian."
              ctaLabel={t("emptyCvCta")}
              ctaHref="/app/cv"
            />
          ) : (
            <div className="flex flex-wrap items-end gap-3">
              <label className="space-y-1">
                <span className="label text-muted block">CV</span>
                <select
                  value={activeCvId}
                  onChange={(event) => setSelectedCvId(event.target.value)}
                  className="rounded-md border border-line bg-paper px-3 py-2 text-ink shadow-xs"
                >
                  {cvs.map((cv) => (
                    <option key={cv.id} value={cv.id}>
                      {cv.title} (v{cv.version})
                    </option>
                  ))}
                </select>
              </label>

              <Button
                variant="primary"
                size="lg"
                icon={<FiSearch />}
                tape="yellow"
                onClick={() => searchMutation.mutate(activeCvId)}
                disabled={!activeCvId || searchMutation.isPending}
              >
                {searchMutation.isPending ? t("loading") : t("discovery.cta")}
              </Button>

              <span className="text-xs text-muted">
                {t("discovery.quota")}:{" "}
                {quotaRemaining === null ? t("unlimited") : quotaRemaining}
              </span>
            </div>
          )}

          {statusQuery.data?.indexAgeHours !== null &&
            statusQuery.data?.indexAgeHours !== undefined ? (
            <p className="text-xs text-muted inline-flex items-center gap-1">
              <FiInfo aria-hidden />
              Indeks berisi {statusQuery.data.indexJobCount.toLocaleString("id-ID")} lowongan,
              diperbarui {statusQuery.data.indexAgeHours} jam lalu.
            </p>
          ) : null}
        </Card>
      </motion.div>

      {searchMutation.isPending ? (
        <div className="space-y-4">
          <Skeleton loading={true} animate="shimmer" fallback={<div className="h-40" />}>
            <div className="h-40" />
          </Skeleton>
          <Skeleton loading={true} animate="shimmer" fallback={<div className="h-40" />}>
            <div className="h-40" />
          </Skeleton>
        </div>
      ) : null}

      {result ? (
        <motion.section variants={containerVariants} className="space-y-8">
          {/* Sumber yang gagal atau filter yang dilonggarkan diberitahukan, tidak disembunyikan. */}
          {result.meta.relaxedFilters.length > 0 || result.meta.unavailableSources.length > 0 ? (
            <motion.div variants={itemVariants}>
              <Card className="p-4 text-sm text-muted">
                {result.meta.relaxedFilters.length > 0 ? (
                  <p>
                    Filter dilonggarkan agar tetap ada hasil:{" "}
                    {result.meta.relaxedFilters.join(", ")}.
                  </p>
                ) : null}
                {result.meta.unavailableSources.length > 0 ? (
                  <p>
                    {t("discovery.partialSources")}: {result.meta.unavailableSources.join(", ")}.
                  </p>
                ) : null}
              </Card>
            </motion.div>
          ) : null}

          {result.emptyState ? (
            <motion.div variants={itemVariants}>
              <Card tape="yellow" className="p-6 space-y-3">
                <h2 className="hand text-2xl font-bold text-ink">{result.emptyState.message}</h2>
                <p className="text-sm text-muted">{result.emptyState.detail}</p>
                {result.emptyState.canRequestAlert && result.emptyState.pendingQueryId ? (
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<FiBell />}
                    onClick={() => alertMutation.mutate(result.emptyState!.pendingQueryId!)}
                    disabled={alertMutation.isPending}
                  >
                    {t("discovery.emptyAlertCta")}
                  </Button>
                ) : null}
              </Card>
            </motion.div>
          ) : null}

          {result.topPicks.length > 0 ? (
            <div className="space-y-4">
              <motion.h2 variants={itemVariants} className="hand text-3xl font-bold text-ink">
                {t("discovery.topPicks")}
              </motion.h2>
              {result.meta.curationNote ? (
                <motion.p variants={itemVariants} className="text-sm text-muted">
                  {result.meta.curationNote}
                </motion.p>
              ) : null}
              <div className="space-y-4">
                {result.topPicks.map((match) => (
                  <JobMatchCard
                    key={match.id}
                    match={match}
                    busy={actionMutation.isPending}
                    onSave={(id) => actionMutation.mutate({ id, action: "save" })}
                    onDismiss={(id) => actionMutation.mutate({ id, action: "dismiss" })}
                    onAnalyze={(id) => actionMutation.mutate({ id, action: "analyze" })}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {result.otherCandidates.length > 0 ? (
            <div className="space-y-4">
              <motion.h2 variants={itemVariants} className="hand text-2xl font-bold text-ink">
                {t("discovery.otherCandidates")}
              </motion.h2>
              <div className="space-y-4">
                {result.otherCandidates.map((match) => (
                  <JobMatchCard
                    key={match.id}
                    match={match}
                    busy={actionMutation.isPending}
                    onSave={(id) => actionMutation.mutate({ id, action: "save" })}
                    onDismiss={(id) => actionMutation.mutate({ id, action: "dismiss" })}
                    onAnalyze={(id) => actionMutation.mutate({ id, action: "analyze" })}
                  />
                ))}
              </div>
            </div>
          ) : null}

          <motion.p variants={itemVariants} className="text-xs text-muted">
            {t("discovery.estimatedMatchDisclaimer")}
          </motion.p>
        </motion.section>
      ) : null}
    </motion.div>
  )
}
