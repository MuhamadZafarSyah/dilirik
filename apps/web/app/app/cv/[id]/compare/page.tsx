"use client"

import { Suspense, use, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { api } from "@/lib/api"
import { useI18n } from "@/lib/i18n"

type CvVersion = { id: string; title: string; version: number; rawText: string }

/** Compare 2 versi CV berdampingan (Flow C — alasan CV lama tidak dihapus). */
function ComparePageInner({ id }: { id: string }) {
  const params = useSearchParams()
  const otherId = params.get("with")
  const { t } = useI18n()
  const [data, setData] = useState<{ before: CvVersion; after: CvVersion } | null>(null)

  useEffect(() => {
    if (!otherId) return
    api.get(`/api/cv/${id}/compare/${otherId}`).then((r) => setData(r.data)).catch(() => {})
  }, [id, otherId])

  if (!otherId) return <p className="text-red">Parameter ?with=cvId dibutuhkan.</p>
  if (!data) return <p className="scrawl text-2xl">{t("loading")}</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="hand text-4xl">{t("compare")}: {data.before.title}</h1>
        <Link href={`/app/cv/${id}`} className="label text-sm underline">← kembali</Link>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {[
          { label: t("before"), cv: data.before, tone: "tape" },
          { label: t("after"), cv: data.after, tone: "tape-blue" },
        ].map(({ label, cv, tone }) => (
          <div key={cv.id} className="card bg-panel border-line relative rounded-lg border-2 p-5 shadow-paper">
            <span className={tone} aria-hidden />
            <div className="mb-3 flex items-center justify-between">
              <span className="hand text-2xl">{label}</span>
              <span className="label text-muted text-xs uppercase">v{cv.version}</span>
            </div>
            <pre className="bg-paper border-line max-h-[36rem] overflow-auto rounded-md border p-3 text-xs whitespace-pre-wrap">{cv.rawText}</pre>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ComparePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <Suspense>
      <ComparePageInner id={id} />
    </Suspense>
  )
}
