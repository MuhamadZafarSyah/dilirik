"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  FiArrowLeft,
  FiZap,
  FiTrash2,
  FiFileText,
  FiCheckCircle,
  FiLayers,
  FiEye,
  FiCode,
} from "react-icons/fi"
import type { CvStructured } from "@dilirik/shared"
import { api } from "@/lib/api"
import { DownloadCvButton } from "@/components/pdf/download-cv-button"
import { Button } from "@/components/ui/button"
import { Card, Sticky } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
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

  if (!cv) {
    return (
      <div className="space-y-6">
        <div className="bg-line/30 h-10 w-48 animate-pulse rounded-lg" />
        <div className="bg-line/20 h-96 animate-pulse rounded-xl border border-line" />
      </div>
    )
  }

  const s = cv.structuredJson
  const extraSections = (s.sections ?? []).filter((sec) => sec.items.length > 0)
  const achievements = s.achievements ?? []

  return (
    <div className="space-y-8">
      {/* Back button */}
      <Link href="/app/cv" className="label text-xs font-bold text-muted hover:text-ink flex items-center gap-1">
        <FiArrowLeft /> Kembali ke Daftar CV
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="label bg-ink text-paper px-2.5 py-0.5 rounded-full text-xs font-bold uppercase">
              {cv.language} · v{cv.version} {cv.parentCvId ? "(Versi Revisi)" : "(Master)"}
            </span>
          </div>
          <h1 className="hand text-4xl sm:text-5xl font-bold mt-1 text-ink">{cv.title}</h1>
          <p className="text-muted text-xs mt-1">
            Dibuat pada {new Date(cv.createdAt).toLocaleString("id-ID")}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <DownloadCvButton cv={s} title={cv.title} version={cv.version} language={cv.language} />

          <Link href={`/app/analyze?cvId=${cv.id}`}>
            <Button variant="danger" icon={<FiZap />} tape="red">
              ⚡ Analisis dengan Lowongan
            </Button>
          </Link>

          {siblings.length > 0 && (
            <Link href={`/app/cv/${cv.id}/compare?with=${siblings[0]!.id}`}>
              <Button variant="outline" icon={<FiLayers />}>
                {t("compare")}
              </Button>
            </Link>
          )}

          <Button
            variant="ghost"
            icon={<FiTrash2 />}
            onClick={async () => {
              if (confirm("Hapus CV ini? Versi lain tidak ikut terhapus.")) {
                await api.delete(`/api/cv/${cv.id}`)
                router.push("/app/cv")
              }
            }}
            className="text-red hover:bg-red/10"
          >
            Hapus
          </Button>
        </div>
      </div>

      {/* Versions bar */}
      {siblings.length > 0 && (
        <div className="flex items-center gap-2 bg-panel p-3 rounded-xl border border-line shadow-paper">
          <span className="label text-xs font-bold text-muted uppercase">Versi Lain Document Ini:</span>
          <div className="flex flex-wrap gap-1.5">
            {siblings.map((v) => (
              <Link
                key={v.id}
                href={`/app/cv/${v.id}`}
                className="label bg-paper border border-line hover:border-ink rounded-lg px-2.5 py-1 text-xs font-bold text-ink"
              >
                v{v.version}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Structured vs Raw Text */}
      <Tabs defaultValue="structured" className="w-full">
        <TabsList>
          <TabsTrigger value="structured" className="flex items-center gap-1.5">
            <FiEye className="h-4 w-4" /> Hasil Ekstraksi AI
          </TabsTrigger>
          <TabsTrigger value="raw" className="flex items-center gap-1.5">
            <FiCode className="h-4 w-4" /> Teks Mentah (Raw)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="structured">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              {s.about && (
                <Card rotate={0.4} pin>
                  <h3 className="label text-xs font-bold uppercase tracking-wider text-muted mb-2">
                    Ringkasan Profil
                  </h3>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{s.about}</p>
                </Card>
              )}

              {s.skills.length > 0 && (
                <Card rotate={-0.5} tape="yellow">
                  <h3 className="label text-xs font-bold uppercase tracking-wider text-muted mb-3">
                    Keahlian & Skill Wajib
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {s.skills.map((skill) => (
                      <span
                        key={skill}
                        className="label bg-blue/15 border border-blue/40 text-blue rounded-md px-2.5 py-1 text-xs font-bold"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </Card>
              )}

              {s.experiences.length > 0 && (
                <Card rotate={0.5}>
                  <h3 className="label text-xs font-bold uppercase tracking-wider text-muted mb-3">
                    Pengalaman Kerja
                  </h3>
                  <div className="space-y-4">
                    {s.experiences.map((exp, i) => (
                      <div key={i} className="border-l-2 border-ink/30 pl-3.5 space-y-1">
                        <p className="text-sm font-bold text-ink">
                          {exp.title} <span className="font-normal text-muted">@ {exp.company ?? "—"}</span>
                        </p>
                        <p className="text-muted text-xs font-semibold">{exp.period ?? "—"}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>

            <div className="space-y-4">
              {achievements.length > 0 && (
                <Card rotate={-0.4}>
                  <h3 className="label text-xs font-bold uppercase tracking-wider text-muted mb-2">
                    Pencapaian Utama
                  </h3>
                  <ul className="space-y-1.5 list-disc pl-4 text-sm">
                    {achievements.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </Card>
              )}

              {s.education.length > 0 && (
                <Card rotate={-0.5}>
                  <h3 className="label text-xs font-bold uppercase tracking-wider text-muted mb-2">
                    Pendidikan
                  </h3>
                  <div className="space-y-2 text-sm">
                    {s.education.map((edu, i) => (
                      <div key={i} className="border-l-2 border-line pl-3">
                        <p className="font-bold">{edu.institution}</p>
                        {edu.degree && <p className="text-muted text-xs">{edu.degree}</p>}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {extraSections.map((sec, i) => (
                <Card key={`${sec.label}-${i}`} rotate={i % 2 === 0 ? 0.5 : -0.5}>
                  <h3 className="label text-xs font-bold uppercase tracking-wider text-muted mb-2">
                    {sec.label}
                  </h3>
                  <ul className="space-y-1 list-disc pl-4 text-sm">
                    {sec.items.map((item, j) => (
                      <li key={j}>{item}</li>
                    ))}
                  </ul>
                </Card>
              ))}

              <Sticky tone="blue" rotate={-0.8}>
                <p className="hand text-lg font-bold">Catatan Guardrail Kejujuran AI 🛡️</p>
                <p className="text-xs text-muted mt-1 leading-relaxed">
                  Setiap rekomendasi analisis AI akan memverifikasi fakta dari teks asli CV di atas.
                  AI tidak akan pernah mengarang pengalaman baru yang tidak ada di CV.
                </p>
              </Sticky>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="raw">
          <Card tape="red">
            <h3 className="label text-xs font-bold uppercase tracking-wider text-muted mb-2">
              Teks Mentah Asli CV
            </h3>
            <pre className="p-4 rounded-xl border-2 border-line bg-paper text-xs font-mono whitespace-pre-wrap max-h-[35rem] overflow-auto leading-relaxed shadow-inner">
              {cv.rawText}
            </pre>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
