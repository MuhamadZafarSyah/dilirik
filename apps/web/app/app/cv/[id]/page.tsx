"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { CvStructured } from "@dilirik/shared"
import { api } from "@/lib/api"
import { DownloadCvButton } from "@/components/pdf/download-cv-button"
import { Button } from "@/components/ui/button"
import { Card, Sticky } from "@/components/ui/card"
import { useI18n } from "@/lib/i18n"

type CvDetail = {
  id: string
  title: string
  language: string
  version: number
  parentCvId: string | null
  rawText: string
  structuredJson: CvStructured
  createdAt: string
}

/** Detail CV: hasil parsing terstruktur + teks asli + aksi (analisis, compare, download PDF, hapus). */
export default function CvDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { t } = useI18n()
  const [cv, setCv] = useState<CvDetail | null>(null)
  const [siblings, setSiblings] = useState<Array<{ id: string; version: number }>>([])

  useEffect(() => {
    api.get<{ cv: CvDetail }>(`/api/cv/${id}`).then(async (r) => {
      setCv(r.data.cv)
      const all = await api.get<{ cvs: Array<{ id: string; version: number; parentCvId: string | null }> }>("/api/cv")
      const rootId = r.data.cv.parentCvId ?? r.data.cv.id
      setSiblings(
        all.data.cvs
          .filter((c) => (c.parentCvId === rootId || c.id === rootId) && c.id !== id)
          .map((c) => ({ id: c.id, version: c.version })),
      )
    }).catch(() => router.push("/app/cv"))
  }, [id, router])

  if (!cv) return <p className="scrawl text-2xl">{t("loading")}</p>
  const s = cv.structuredJson
  // Section dinamis dari CV user (Bahasa, Sertifikasi, Proyek, dll) — guard utk data lama
  const extraSections = (s.sections ?? []).filter((sec) => sec.items.length > 0)
  const achievements = s.achievements ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="hand text-4xl">{cv.title}</h1>
          <p className="label text-muted text-xs uppercase">bahasa: {cv.language} · versi {cv.version}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DownloadCvButton rawText={cv.rawText} title={cv.title} version={cv.version} language={cv.language} />
          <Link href={`/app/analyze?cvId=${cv.id}`} className="label bg-red text-paper rounded-md px-4 py-2 text-sm font-bold">⚡ Analisis dengan lowongan</Link>
          {siblings.length > 0 ? (
            <Link href={`/app/cv/${cv.id}/compare?with=${siblings[0]!.id}`} className="label bg-panel border-line rounded-md border-2 px-4 py-2 text-sm font-bold">{t("compare")}</Link>
          ) : null}
          <Button variant="danger" onClick={async () => {
            if (confirm("Hapus CV ini? Versi lain tidak ikut terhapus.")) {
              await api.delete(`/api/cv/${cv.id}`)
              router.push("/app/cv")
            }
          }}>Hapus</Button>
        </div>
      </div>

      {siblings.length > 0 ? (
        <div className="flex items-center gap-2">
          <span className="label text-muted text-xs uppercase">Versi lain:</span>
          {siblings.map((v) => (
            <Link key={v.id} href={`/app/cv/${v.id}`} className="label border-line rounded-sm border px-2 py-0.5 text-xs hover:bg-line/40">v{v.version}</Link>
          ))}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Hasil parsing — kartu DINAMIS mengikuti isi CV, semuanya jadi bahan analisis */}
        <div className="space-y-4">
          <h2 className="scrawl text-2xl">Hasil baca AI</h2>

          {s.about ? (
            <Card className="rotate-[0.4deg]">
              <h3 className="label text-xs font-bold uppercase">Tentang</h3>
              <p className="mt-2 text-sm whitespace-pre-wrap">{s.about}</p>
            </Card>
          ) : null}

          {s.skills.length > 0 ? (
            <Card className="rotate-[-0.5deg]">
              <h3 className="label text-xs font-bold uppercase">Skills</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {s.skills.map((skill) => (
                  <span key={skill} className="label bg-blue/15 text-blue rounded-sm px-2 py-0.5 text-xs font-semibold">{skill}</span>
                ))}
              </div>
            </Card>
          ) : null}

          {s.experiences.length > 0 ? (
            <Card className="rotate-[0.5deg]">
              <h3 className="label text-xs font-bold uppercase">Pengalaman</h3>
              <ul className="mt-2 space-y-3">
                {s.experiences.map((exp, i) => (
                  <li key={i} className="border-line border-l-2 pl-3">
                    <p className="text-sm font-bold">{exp.title} · <span className="font-normal">{exp.company ?? "—"}</span></p>
                    <p className="text-muted text-xs">{exp.period ?? "—"}</p>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {achievements.length > 0 ? (
            <Card className="rotate-[-0.4deg]">
              <h3 className="label text-xs font-bold uppercase">Pencapaian</h3>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
                {achievements.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </Card>
          ) : null}

          {s.education.length > 0 ? (
            <Card className="rotate-[-0.5deg]">
              <h3 className="label text-xs font-bold uppercase">Pendidikan</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {s.education.map((edu, i) => (
                  <li key={i}>{edu.degree ? `${edu.degree} — ` : ""}{edu.institution}</li>
                ))}
              </ul>
            </Card>
          ) : null}

          {/* Section dinamis: Bahasa, Sertifikasi, Proyek, Organisasi, dll — muncul sesuai isi CV */}
          {extraSections.map((sec, i) => (
            <Card key={`${sec.label}-${i}`} className={i % 2 === 0 ? "rotate-[0.5deg]" : "rotate-[-0.5deg]"}>
              <h3 className="label text-xs font-bold uppercase">{sec.label}</h3>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
                {sec.items.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ul>
            </Card>
          ))}

          <Sticky tone="blue" className="text-xs">
            Semua kartu di atas mengikuti isi CV-mu dan ikut jadi bahan analisis. Hasil baca kurang akurat? Analisis tetap memakai teks asli CV sebagai sumber fakta — dan PDF di-download dari teks asli, bukan dari kartu ini.
          </Sticky>
        </div>

        {/* Teks asli */}
        <div>
          <h2 className="scrawl text-2xl">Teks asli</h2>
          <pre className="card bg-paper border-line mt-4 max-h-[32rem] overflow-auto rounded-lg border-2 p-4 text-xs whitespace-pre-wrap">{cv.rawText}</pre>
        </div>
      </div>
    </div>
  )
}
