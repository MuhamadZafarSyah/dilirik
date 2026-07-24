"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { api } from "@/lib/api"
import { Polaroid } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { useI18n } from "@/lib/i18n"

type CvItem = {
  id: string
  title: string
  language: string
  version: number
  parentCvId: string | null
  createdAt: string
}

/** Daftar CV (PRD /app/cv) — polaroid grid, versi tergrup per CV root. */
export default function CvListPage() {
  const { t } = useI18n()
  const [cvs, setCvs] = useState<CvItem[] | null>(null)

  useEffect(() => {
    api.get<{ cvs: CvItem[] }>("/api/cv").then((r) => setCvs(r.data.cvs)).catch(() => setCvs([]))
  }, [])

  if (!cvs) return <p className="scrawl text-2xl">{t("loading")}</p>

  // Grup: root → versi-versinya
  const roots = cvs.filter((cv) => !cv.parentCvId)
  const versionsOf = (rootId: string) => cvs.filter((cv) => cv.parentCvId === rootId)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="hand text-4xl">{t("cv")}</h1>
        <Link href="/app/cv/new" className="label bg-ink text-paper rounded-md px-4 py-2 text-sm font-bold transition-transform hover:rotate-[-2deg]">
          + Tambah CV
        </Link>
      </div>

      {roots.length === 0 ? (
        <EmptyState
          title={t("emptyCvTitle")}
          note="Upload PDF/DOCX atau paste teks CV kamu — bahasa apa pun."
          ctaLabel={t("emptyCvCta")}
          ctaHref="/app/cv/new"
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {roots.map((cv) => {
            const versions = versionsOf(cv.id)
            return (
              <Polaroid key={cv.id}>
                <Link href={`/app/cv/${cv.id}`} className="block">
                  <div className="bg-paper border-line flex h-28 items-center justify-center rounded-sm border">
                    <span className="hand text-4xl" aria-hidden>📄</span>
                  </div>
                  <p className="hand mt-3 text-xl">{cv.title}</p>
                  <p className="label text-muted text-xs uppercase">
                    {cv.language} · v{cv.version}
                    {versions.length > 0 ? ` · +${versions.length} versi` : ""}
                  </p>
                </Link>
                {versions.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {versions.map((v) => (
                      <Link key={v.id} href={`/app/cv/${v.id}`} className="label border-line rounded-sm border px-1.5 py-0.5 text-[10px] hover:bg-line/40">
                        v{v.version}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </Polaroid>
            )
          })}
        </div>
      )}
    </div>
  )
}
