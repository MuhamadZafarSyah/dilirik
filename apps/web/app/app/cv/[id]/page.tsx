"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { CvStructured } from "@dilirik/shared"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api, errorMessage } from "@/lib/api"
import { CvDesignPanel } from "@/components/pdf/cv-design-panel"
import { DownloadCvMenu } from "@/components/pdf/download-cv-menu"
import { Button } from "@/components/ui/button"
import { Card, Sticky } from "@/components/ui/card"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useToast } from "@/components/ui/toast"
import { useI18n } from "@/lib/i18n"

type CvDetail = {
  id: string
  title: string
  language: string
  version: number
  parentCvId: string | null
  rawText: string
  structuredJson: CvStructured
  fileKey: string | null
  createdAt: string
}

type CvListItem = { id: string; version: number; parentCvId: string | null }

/** Detail CV: desain asli (PDF) + hasil parsing terstruktur + aksi (analisis, compare, download Word/PDF, hapus). */
export default function CvDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { t } = useI18n()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [designTab, setDesignTab] = useState<"design" | "text">("design")

  const cvQuery = useQuery({
    queryKey: ["cv", id],
    queryFn: async () => {
      const { data } = await api.get<{ cv: CvDetail }>(`/api/cv/${id}`)
      return data.cv
    },
  })

  // Versi lain diturunkan dari cache ["cvs"] — tidak perlu effect berantai.
  const allCvsQuery = useQuery({
    queryKey: ["cvs"],
    queryFn: async () => {
      const { data } = await api.get<{ cvs: CvListItem[] }>("/api/cv")
      return data.cvs
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/api/cv/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cvs"] })
      toast("CV dihapus. Versi lain tetap aman.", "success")
      router.push("/app/cv")
    },
    onError: (err) => toast(errorMessage(err), "error"),
  })

  // Satu-satunya effect: navigasi keluar bila CV tidak ditemukan (bukan data-fetching).
  useEffect(() => {
    if (cvQuery.isError) router.push("/app/cv")
  }, [cvQuery.isError, router])

  const cv = cvQuery.data ?? null
  const rootId = cv ? (cv.parentCvId ?? cv.id) : null
  const siblings =
    cv && allCvsQuery.data
      ? allCvsQuery.data
          .filter((c) => (c.parentCvId === rootId || c.id === rootId) && c.id !== id)
          .map((c) => ({ id: c.id, version: c.version }))
      : []

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
        <div className="flex flex-wrap items-center gap-2">
          <DownloadCvMenu cv={cv} />
          <Link href={`/app/analyze?cvId=${cv.id}`} className="label bg-red text-paper rounded-md px-4 py-2 text-sm font-bold">⚡ Analisis dengan lowongan</Link>
          {siblings.length > 0 ? (
            <Link href={`/app/cv/${cv.id}/compare?with=${siblings[0]!.id}`} className="label bg-panel border-line rounded-md border-2 px-4 py-2 text-sm font-bold">{t("compare")}</Link>
          ) : null}
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>Hapus</Button>
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
            Semua kartu di atas mengikuti isi CV-mu dan ikut jadi bahan analisis. Hasil baca kurang akurat? Analisis tetap memakai teks asli CV sebagai sumber fakta — dan file yang kamu download tetap memakai desain aslinya, bukan kartu ini.
          </Sticky>
        </div>

        {/* Desain asli (PDF) + teks asli — upload DOCX otomatis dikonversi ke PDF */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="scrawl text-2xl">CV kamu</h2>
            {cv.fileKey ? (
              <div className="border-line bg-panel inline-flex items-center gap-1 rounded-lg border-2 p-1">
                {(
                  [
                    ["design", "🎨 Desain asli"],
                    ["text", "📝 Teks"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDesignTab(value)}
                    aria-pressed={designTab === value}
                    className={`label rounded-md px-3 py-1 text-xs font-bold uppercase transition-colors ${
                      designTab === value ? "bg-ink text-paper" : "text-muted hover:bg-line/40"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          {cv.fileKey && designTab === "design" ? (
            <CvDesignPanel cvId={cv.id} fileKey={cv.fileKey} fallbackText={cv.rawText} maxHeightClassName="max-h-[44rem]" />
          ) : (
            <pre className="card bg-paper border-line max-h-[32rem] overflow-auto rounded-lg border-2 p-4 text-xs leading-relaxed whitespace-pre-wrap">{cv.rawText}</pre>
          )}
        </div>
      </div>

      {/* Konfirmasi hapus — pengganti window.confirm */}
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Hapus CV ini?"
        description="Versi lain dari CV ini tidak ikut terhapus — hanya versi yang sedang dibuka."
        confirmLabel="Ya, hapus CV"
        onConfirm={async () => {
          await deleteMutation.mutateAsync().catch(() => {})
        }}
      />
    </div>
  )
}
