"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { APPLICATION_STATUSES, type ApplicationStatus, type JobParsed } from "@dilirik/shared"
import { api } from "@/lib/api"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { StatusBadge } from "@/components/ui/status-badge"
import { useI18n } from "@/lib/i18n"

type AppItem = {
  id: string
  status: ApplicationStatus
  matchScore: number | null
  updatedAt: string
  cv: { id: string; title: string; version: number }
  jobPosting: { id: string; parsedJson: JobParsed }
}

/** Tracker lamaran (PRD §7.5, Flow D) — filter status via query param. */
function ApplicationsList() {
  const params = useSearchParams()
  const { lang, t } = useI18n()
  const [filter, setFilter] = useState<ApplicationStatus | "">((params.get("status") as ApplicationStatus) ?? "")
  const [items, setItems] = useState<AppItem[] | null>(null)

  const load = useCallback(() => {
    api.get<{ applications: AppItem[] }>(`/api/applications${filter ? `?status=${filter}` : ""}`)
      .then((r) => setItems(r.data.applications))
      .catch(() => setItems([]))
  }, [filter])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-6">
      <h1 className="hand text-4xl">{t("applications")}</h1>

      {/* Filter status */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilter("")}
          className={`label rounded-sm px-3 py-1 text-xs font-bold uppercase ${filter === "" ? "bg-ink text-paper" : "bg-panel border-line border-2"}`}>
          Semua
        </button>
        {APPLICATION_STATUSES.map((status) => (
          <button key={status} onClick={() => setFilter(status)}
            className={`label rounded-sm px-3 py-1 text-xs font-bold uppercase ${filter === status ? "bg-ink text-paper" : "bg-panel border-line border-2"}`}>
            {status}
          </button>
        ))}
      </div>

      {!items ? <p className="scrawl text-2xl">{t("loading")}</p> : items.length === 0 ? (
        <EmptyState title="Belum ada lamaran di sini" note="Jalankan analisis lalu klik “Simpan ke lamaran”." ctaLabel={t("newAnalysis")} ctaHref="/app/analyze" />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Link key={item.id} href={`/app/applications/${item.id}`}>
              <Card className="mb-3 flex flex-wrap items-center justify-between gap-3 transition-transform hover:rotate-[-0.5deg]">
                <div>
                  <p className="hand text-2xl">{item.jobPosting.parsedJson.jobTitle || "Untitled"}</p>
                  <p className="label text-muted text-xs uppercase">
                    {item.jobPosting.parsedJson.company ?? "—"} · CV: {item.cv.title} v{item.cv.version}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {item.matchScore !== null ? <span className="hand text-3xl">{item.matchScore}</span> : null}
                  <StatusBadge status={item.status} lang={lang} />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ApplicationsPage() {
  return (
    <Suspense>
      <ApplicationsList />
    </Suspense>
  )
}
