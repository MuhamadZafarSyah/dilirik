"use client"

import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Skeleton } from "boneyard-js/react"
import { motion } from "framer-motion"
import { useState, useEffect, Suspense } from "react"
import { FiBell, FiInfo, FiSearch, FiSliders } from "react-icons/fi"
import { JobMatchCard, type JobMatchView } from "@/components/discovery/job-match-card"
import {
  DiscoveryFilterDrawer,
  type SearchFilters,
} from "@/components/discovery/discovery-filter-drawer"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/toast"
import { api, errorMessage } from "@/lib/api"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"

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

const DEFAULT_FILTERS: SearchFilters = {
  remotePref: "any",
  locations: [],
  seniority: "",
  salaryMin: undefined,
  postedWithinDays: 30,
}

function DiscoveryContent() {
  const { t, lang } = useI18n()
  const { toast } = useToast()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()

  const paramCvId = searchParams.get("cvId") || ""
  const [selectedCvId, setSelectedCvId] = useState<string>(paramCvId)
  const [result, setResult] = useState<SearchResponse | null>(null)
  const [filterTab, setFilterTab] = useState<"all" | "top" | "saved" | "hidden">("all")
  const [searchFilter, setSearchFilter] = useState("")

  // Filter Drawer State
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false)
  const [customFilters, setCustomFilters] = useState<SearchFilters>(DEFAULT_FILTERS)

  const cvsQuery = useQuery({
    queryKey: ["cvs"],
    queryFn: async () => {
      const response = await api.get<{ cvs: CvListItem[] }>("/api/cv")
      return response.data.cvs
    },
  })

  const cvs = cvsQuery.data ?? []
  const activeCvId = selectedCvId || paramCvId || cvs[0]?.id || ""

  // Sinkronisasi pilihan CV ke URL query parameter tanpa reload
  const updateCvParam = (newCvId: string) => {
    setSelectedCvId(newCvId)
    setResult(null)
    const params = new URLSearchParams(searchParams.toString())
    if (newCvId) {
      params.set("cvId", newCvId)
    } else {
      params.delete("cvId")
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  // Jika URL belum memiliki cvId tapi cvs sudah di-load, isi default param
  useEffect(() => {
    if (!paramCvId && cvs.length > 0 && cvs[0]?.id) {
      updateCvParam(cvs[0].id)
    }
  }, [paramCvId, cvs])

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

  const hasFilterOverrides =
    customFilters.remotePref !== "any" ||
    customFilters.locations.length > 0 ||
    Boolean(customFilters.seniority) ||
    Boolean(customFilters.salaryMin && customFilters.salaryMin > 0) ||
    customFilters.postedWithinDays !== 30

  const searchMutation = useMutation({
    mutationFn: async ({
      cvId,
      filters,
    }: {
      cvId: string
      filters?: SearchFilters
    }) => {
      const payload: Record<string, unknown> = { cvId }

      if (filters) {
        payload.postedWithinDays = filters.postedWithinDays

        payload.profileOverrides = {
          remotePref: filters.remotePref,
          locations: filters.locations,
          seniority: filters.seniority || undefined,
          salaryMin: filters.salaryMin && filters.salaryMin > 0 ? filters.salaryMin : undefined,
        }
      }

      const response = await api.post<SearchResponse>("/api/discovery/search", payload)
      return response.data
    },
    onSuccess: (data) => {
      setResult(data)
      queryClient.invalidateQueries({ queryKey: ["discovery-status"] })
      queryClient.invalidateQueries({ queryKey: ["discovery-runs"] })
      toast("Pencarian lowongan selesai!", "success")
    },
    onError: (error) => toast(errorMessage(error), "error"),
  })

  const actionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "save" | "unsave" | "dismiss" | "undismiss" | "analyze" }) => {
      const body = action === "dismiss" ? { reason: "other" } : {}
      const response = await api.post(`/api/discovery/matches/${id}/${action}`, body)
      return { id, action, data: response.data as Record<string, unknown> }
    },
    onMutate: async ({ id, action }) => {
      // Terapkan Optimistic Update ke React Query cache dan Local State seketika
      const newStatus =
        action === "save"
          ? "SAVED"
          : action === "unsave" || action === "undismiss"
            ? "NEW"
            : action === "dismiss"
              ? "DISMISSED"
              : undefined

      if (newStatus) {
        // 1. Optimistic update local state result
        setResult((current) => {
          if (!current) return current
          return {
            ...current,
            topPicks: current.topPicks.map((item) =>
              item.id === id ? { ...item, status: newStatus } : item,
            ),
            otherCandidates: current.otherCandidates.map((item) =>
              item.id === id ? { ...item, status: newStatus } : item,
            ),
          }
        })

        // 2. Optimistic update React Query cache untuk run detail
        if (latestMatchingRunId) {
          queryClient.setQueryData<SearchResponse>(["discovery-run", latestMatchingRunId], (old) => {
            if (!old) return old
            return {
              ...old,
              topPicks: old.topPicks.map((item) =>
                item.id === id ? { ...item, status: newStatus } : item,
              ),
              otherCandidates: old.otherCandidates.map((item) =>
                item.id === id ? { ...item, status: newStatus } : item,
              ),
            }
          })
        }
      }
    },
    onSuccess: ({ id, action, data }) => {
      if (action === "analyze") {
        toast(
          "Lowongan disiapkan untuk analisis. Analisis penuh memakai kuota analisis.",
          "success",
        )
      } else if (action === "save") {
        toast("Disimpan ke tracker", "success")
      } else if (action === "unsave") {
        toast("Dihapus dari tracker", "success")
      } else if (action === "undismiss") {
        toast("Lowongan ditampilkan kembali", "success")
      } else {
        toast("Lowongan disembunyikan", "success")
      }

      // Sinkronisasi data asli dari server bila tersedia
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
    onError: (error) => {
      toast(errorMessage(error), "error")
      // Revert cache bila request backend gagal
      if (latestMatchingRunId) {
        queryClient.invalidateQueries({ queryKey: ["discovery-run", latestMatchingRunId] })
      }
    },
  })

  const alertMutation = useMutation({
    mutationFn: async (pendingQueryId: string) => {
      await api.post("/api/discovery/alerts", { pendingQueryId })
    },
    onSuccess: () => toast("Kami kabari kalau ada lowongan yang cocok", "success"),
    onError: (error) => toast(errorMessage(error), "error"),
  })

  const quotaRemaining = statusQuery.data?.quota.remaining ?? null

  const runsQuery = useQuery({
    queryKey: ["discovery-runs"],
    queryFn: async () => {
      const response = await api.get<{
        runs: Array<{ id: string; cvId: string; status: string; createdAt: string }>
      }>("/api/discovery/runs")
      return response.data.runs
    },
  })

  const latestMatchingRunId = runsQuery.data?.find((r) => r.cvId === activeCvId)?.id

  const lastRunDetailQuery = useQuery({
    queryKey: ["discovery-run", latestMatchingRunId],
    queryFn: async () => {
      if (!latestMatchingRunId) return null
      const response = await api.get<SearchResponse>(`/api/discovery/runs/${latestMatchingRunId}`)
      return response.data
    },
    enabled: !!latestMatchingRunId && !result,
  })

  const activeResult = result ?? lastRunDetailQuery.data ?? null
  const isInitialLoading = runsQuery.isLoading || (!!latestMatchingRunId && lastRunDetailQuery.isLoading)

  const allMatches = activeResult
    ? [...activeResult.topPicks, ...activeResult.otherCandidates]
    : []

  const hiddenMatchesCount = allMatches.filter((m) => m.status === "DISMISSED").length
  const activeMatches = allMatches.filter((m) => m.status !== "DISMISSED")

  const filteredMatches = allMatches.filter((match) => {
    if (filterTab === "hidden") {
      if (match.status !== "DISMISSED") return false
    } else {
      if (match.status === "DISMISSED") return false
      if (filterTab === "top" && !match.isTopPick) return false
      if (filterTab === "saved" && match.status !== "SAVED") return false
    }

    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase()
      const matchText = `${match.title} ${match.company} ${match.location ?? ""} ${match.matchedSkills.join(" ")}`.toLowerCase()
      return matchText.includes(q)
    }
    return true
  })

  const topPicksList = filteredMatches.filter((m) => m.isTopPick)
  const otherCandidatesList = filteredMatches.filter((m) => !m.isTopPick)

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-6 px-4 sm:px-6">
      {/* Elegant & Clean Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line/60 pb-5">
        <div>
          <h1 className="hand text-3xl sm:text-4xl font-bold text-ink tracking-tight">
            {t("discovery.title")}
          </h1>
          <p className="scrawl text-muted text-base sm:text-lg mt-0.5">
            {t("discovery.subtitle")}
          </p>
        </div>

        {/* {statusQuery.data?.indexJobCount !== undefined && (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-panel border border-line text-xs text-muted font-medium self-start sm:self-auto shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-green" />
            <span>{statusQuery.data.indexJobCount.toLocaleString("id-ID")} lowongan terindeks</span>
          </div>
        )} */}
      </header>

      {/* Clean Control Bar with Global Select Component */}
      <div className="rounded-2xl border border-line bg-panel p-4 sm:p-5 shadow-xs space-y-4">
        {cvsQuery.isLoading ? (
          <Skeleton loading={true} animate="shimmer" fallback={<div className="h-10" />}>
            <div className="h-10" />
          </Skeleton>
        ) : cvs.length === 0 ? (
          <EmptyState
            title={t("emptyCvTitle")}
            note="Unggah CV kamu terlebih dahulu untuk mulai mencari lowongan."
            ctaLabel={t("emptyCvCta")}
            ctaHref="/app/cv"
          />
        ) : (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <span className="text-xs font-bold text-muted uppercase shrink-0">CV:</span>
              <div className="w-full sm:max-w-xs">
                <Select value={activeCvId} onValueChange={updateCvParam}>
                  <SelectTrigger className="w-full rounded-xl border-2 border-line bg-paper px-3 py-2 text-sm font-medium text-ink shadow-2xs focus:border-ink">
                    <SelectValue placeholder="Pilih CV..." />
                  </SelectTrigger>
                  <SelectContent>
                    {cvs.map((cv) => (
                      <SelectItem key={cv.id} value={cv.id}>
                        📄 {cv.title} (v{cv.version})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2.5 flex-wrap sm:flex-nowrap">
              <span className="text-xs text-muted mr-1">
                Sisa kuota:{" "}
                <strong className="text-ink">
                  {quotaRemaining === null ? "Tak terbatas" : quotaRemaining}
                </strong>
              </span>

              {/* Filter Button */}
              <button
                type="button"
                onClick={() => setIsFilterDrawerOpen(true)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-2xs shrink-0",
                  hasFilterOverrides
                    ? "bg-blue/10 text-blue border-blue font-bold"
                    : "bg-paper text-ink border-line hover:border-ink/60",
                )}
              >
                <FiSliders className={cn("w-3.5 h-3.5", hasFilterOverrides && "text-blue")} />
                <span>Filter</span>
                {hasFilterOverrides && (
                  <span className="w-2 h-2 rounded-full bg-blue animate-pulse" />
                )}
              </button>

              <Button
                variant="primary"
                size="sm"
                icon={<FiSearch className="text-yellow w-3.5 h-3.5" />}
                onClick={() =>
                  searchMutation.mutate({
                    cvId: activeCvId,
                    filters: customFilters,
                  })
                }
                disabled={!activeCvId || searchMutation.isPending}
                className="shadow-xs shrink-0"
              >
                {searchMutation.isPending
                  ? "Mencari..."
                  : activeResult
                    ? t("discovery.reSearch")
                    : t("discovery.cta")}
              </Button>
            </div>
          </div>
        )}

        {/* Filter Overrides Summary Pill (jika aktif) */}
        {hasFilterOverrides && (
          <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-line/50 text-xs">
            <span className="text-muted font-bold">Filter Aktif:</span>
            {customFilters.remotePref !== "any" && (
              <span className="px-2.5 py-0.5 rounded-md bg-blue/10 text-blue border border-blue/30 font-semibold uppercase">
                {customFilters.remotePref}
              </span>
            )}
            {customFilters.locations.map((loc) => (
              <span key={loc} className="px-2.5 py-0.5 rounded-md bg-paper border border-line font-medium text-ink">
                📍 {loc}
              </span>
            ))}
            {customFilters.seniority && (
              <span className="px-2.5 py-0.5 rounded-md bg-paper border border-line font-medium text-ink">
                Level: {customFilters.seniority}
              </span>
            )}
            {Boolean(customFilters.salaryMin && customFilters.salaryMin > 0) && (
              <span className="px-2.5 py-0.5 rounded-md bg-paper border border-line font-medium text-ink">
                Min: Rp {customFilters.salaryMin?.toLocaleString("id-ID")}
              </span>
            )}
            {customFilters.postedWithinDays !== 30 && (
              <span className="px-2.5 py-0.5 rounded-md bg-paper border border-line font-medium text-ink">
                {customFilters.postedWithinDays} hari
              </span>
            )}
            <button
              type="button"
              onClick={() => setCustomFilters(DEFAULT_FILTERS)}
              className="text-xs text-muted hover:text-red underline ml-1 cursor-pointer"
            >
              Hapus
            </button>
          </div>
        )}

        {/* Minimal Profile Chips */}
        {activeResult?.searchProfile && !hasFilterOverrides && (
          <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-line/50 text-xs">
            <span className="text-muted font-medium mr-1">Target:</span>
            {activeResult.searchProfile.roles.map((role) => (
              <span key={role} className="px-2.5 py-0.5 rounded-md bg-paper border border-line font-medium text-ink">
                {role}
              </span>
            ))}
            {activeResult.searchProfile.skills.slice(0, 4).map((skill) => (
              <span key={skill} className="px-2 py-0.5 rounded-md bg-panel border border-line/60 text-muted">
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Loading Skeletons */}
      {(searchMutation.isPending || (isInitialLoading && !activeResult)) && (
        <div className="space-y-3">
          <Skeleton loading={true} animate="shimmer" fallback={<div className="h-32" />}>
            <div className="h-32 rounded-2xl" />
          </Skeleton>
          <Skeleton loading={true} animate="shimmer" fallback={<div className="h-32" />}>
            <div className="h-32 rounded-2xl" />
          </Skeleton>
        </div>
      )}

      {/* Result Listing */}
      {activeResult && !searchMutation.isPending && (
        <div className="space-y-5">
          {/* Quick Filter Navigation & Middle Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1 p-1 bg-panel rounded-xl border border-line shadow-2xs self-start">
              <button
                type="button"
                onClick={() => setFilterTab("all")}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  filterTab === "all" ? "bg-ink text-paper" : "text-muted hover:text-ink",
                )}
              >
                Semua ({activeMatches.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("top")}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  filterTab === "top" ? "bg-yellow text-ink font-bold" : "text-muted hover:text-ink",
                )}
              >
                ★ Top Picks ({activeMatches.filter((m) => m.isTopPick).length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("saved")}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  filterTab === "saved" ? "bg-blue text-paper font-bold" : "text-muted hover:text-ink",
                )}
              >
                Tersimpan ({activeMatches.filter((m) => m.status === "SAVED").length})
              </button>
              {hiddenMatchesCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterTab("hidden")}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                    filterTab === "hidden" ? "bg-red/80 text-paper font-bold" : "text-muted hover:text-ink",
                  )}
                >
                  Disembunyikan ({hiddenMatchesCount})
                </button>
              )}
            </div>

            {/* Middle Search Input */}
            <div className="flex items-center gap-3 flex-1 max-w-sm">
              <div className="relative flex-1">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted h-4 w-4" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder={lang === "id" ? "Cari nama posisi, perusahaan, atau CV..." : "Search task, company, or CV..."}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border-2 border-line bg-paper text-ink text-xs font-bold outline-none focus:border-ink shadow-inner"
                />
              </div>
            </div>
          </div>

          {/* Empty State / AI Note */}
          {activeResult.meta.curationNote && (
            <div className="p-3 rounded-xl bg-paper border border-line text-xs text-ink leading-relaxed flex items-start gap-2">
              <span className="text-yellow shrink-0">💡</span>
              <p>{activeResult.meta.curationNote}</p>
            </div>
          )}

          {/* Top Picks List */}
          {topPicksList.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="hand text-2xl font-bold text-ink">
                  {t("discovery.topPicks")}
                </h2>
                <span className="text-xs text-muted">{topPicksList.length} lowongan</span>
              </div>

              <div className="space-y-3">
                {topPicksList.map((match) => (
                  <JobMatchCard
                    key={match.id}
                    match={match}
                    busy={actionMutation.isPending}
                    onSave={(id) => actionMutation.mutate({ id, action: "save" })}
                    onUnsave={(id) => actionMutation.mutate({ id, action: "unsave" })}
                    onDismiss={(id) => actionMutation.mutate({ id, action: "dismiss" })}
                    onUndismiss={(id) => actionMutation.mutate({ id, action: "undismiss" })}
                    onAnalyze={(id) => actionMutation.mutate({ id, action: "analyze" })}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Other Candidates List */}
          {otherCandidatesList.length > 0 && (
            <div className="space-y-3 pt-3">
              <div className="flex items-center justify-between">
                <h2 className="hand text-xl font-bold text-ink">
                  {filterTab === "hidden" ? "Lowongan Disembunyikan" : t("discovery.otherCandidates")}
                </h2>
                <span className="text-xs text-muted">{otherCandidatesList.length} lowongan</span>
              </div>

              <div className="space-y-3">
                {otherCandidatesList.map((match) => (
                  <JobMatchCard
                    key={match.id}
                    match={match}
                    busy={actionMutation.isPending}
                    onSave={(id) => actionMutation.mutate({ id, action: "save" })}
                    onUnsave={(id) => actionMutation.mutate({ id, action: "unsave" })}
                    onDismiss={(id) => actionMutation.mutate({ id, action: "dismiss" })}
                    onUndismiss={(id) => actionMutation.mutate({ id, action: "undismiss" })}
                    onAnalyze={(id) => actionMutation.mutate({ id, action: "analyze" })}
                  />
                ))}
              </div>
            </div>
          )}

          {filteredMatches.length === 0 && (
            <div className="p-8 text-center bg-panel border border-line rounded-2xl text-xs text-muted">
              {filterTab === "hidden"
                ? "Tidak ada lowongan yang disembunyikan."
                : "Tidak ada lowongan yang sesuai filter pencarian saat ini."}
            </div>
          )}

          <p className="text-[11px] text-muted text-center pt-2">
            {t("discovery.estimatedMatchDisclaimer")}
          </p>
        </div>
      )}

      {/* Discovery Filter Drawer (Side Sheet) */}
      <DiscoveryFilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        filters={customFilters}
        onApply={(newFilters) => {
          setCustomFilters(newFilters)
          toast("Filter pencarian diterapkan! Klik 'Cari Lowongan' untuk mencari.", "info")
        }}
        onReset={() => {
          setCustomFilters(DEFAULT_FILTERS)
          toast("Filter pencarian direset ke default CV.", "info")
        }}
      />
    </div>
  )
}

export default function DiscoveryPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto space-y-6 py-6 px-4 sm:px-6">
          <div className="h-10 w-48 rounded-lg bg-panel animate-pulse" />
          <div className="h-32 rounded-2xl bg-panel animate-pulse" />
        </div>
      }
    >
      <DiscoveryContent />
    </Suspense>
  )
}


