"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { FiArrowLeft, FiZap, FiTrash2, FiGlobe, FiCheckCircle, FiStar, FiFileText } from "react-icons/fi"
import type { JobParsed } from "@dilirik/shared"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useI18n } from "@/lib/i18n"

type JobDetail = { id: string; parsedJson: JobParsed; rawText: string; sourceUrl: string | null }

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { t } = useI18n()
  const [job, setJob] = useState<JobDetail | null>(null)

  useEffect(() => {
    api.get<{ job: JobDetail }>(`/api/jobs/${id}`).then((r) => setJob(r.data.job)).catch(() => router.push("/app/jobs"))
  }, [id, router])

  if (!job) {
    return (
      <div className="space-y-6">
        <div className="bg-line/30 h-10 w-48 animate-pulse rounded-lg" />
        <div className="bg-line/20 h-96 animate-pulse rounded-xl border border-line" />
      </div>
    )
  }

  const p = job.parsedJson

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link href="/app/jobs" className="label text-xs font-bold text-muted hover:text-ink flex items-center gap-1">
        <FiArrowLeft /> Kembali ke Daftar Lowongan
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="label bg-blue/20 text-blue border border-blue/40 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase">
              {p.company ?? "Perusahaan"} {p.level ? `· ${p.level}` : ""}
            </span>
          </div>
          <h1 className="hand text-4xl sm:text-5xl font-bold mt-1 text-ink">
            {p.jobTitle || "Posisi Tanpa Judul"}
          </h1>
          {job.sourceUrl && (
            <a
              href={job.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="label text-xs text-blue hover:underline flex items-center gap-1 mt-1 font-bold"
            >
              <FiGlobe /> Buka Halaman Sumber ({new URL(job.sourceUrl).hostname})
            </a>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <Link href={`/app/analyze?jobId=${job.id}`}>
            <Button variant="danger" icon={<FiZap />} tape="red">
              ⚡ Analisis dengan CV-ku
            </Button>
          </Link>

          <Button
            variant="ghost"
            icon={<FiTrash2 />}
            onClick={async () => {
              if (confirm("Hapus lowongan ini?")) {
                await api.delete(`/api/jobs/${job.id}`)
                router.push("/app/jobs")
              }
            }}
            className="text-red hover:bg-red/10"
          >
            Hapus
          </Button>
        </div>
      </div>

      {/* Grid: Extracted Requirements vs Raw Job Posting */}
      <Tabs defaultValue="parsed" className="w-full">
        <TabsList>
          <TabsTrigger value="parsed" className="flex items-center gap-1.5">
            <FiCheckCircle className="h-4 w-4" /> Hasil Ekstraksi AI
          </TabsTrigger>
          <TabsTrigger value="raw" className="flex items-center gap-1.5">
            <FiFileText className="h-4 w-4" /> Teks Mentah (Raw)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="parsed">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <Card rotate={-0.5} tape="red" pin>
                <h3 className="label text-xs font-bold uppercase tracking-wider text-red mb-3 flex items-center gap-1">
                  <FiCheckCircle className="h-4 w-4" /> Skill Wajib (Must-Have)
                </h3>
                <div className="flex flex-wrap gap-2">
                  {p.mustHaveSkills.map((skill) => (
                    <span
                      key={skill}
                      className="label bg-red/15 border border-red/40 text-red rounded-md px-2.5 py-1 text-xs font-bold"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </Card>

              <Card rotate={0.5} tape="yellow">
                <h3 className="label text-xs font-bold uppercase tracking-wider text-blue mb-3 flex items-center gap-1">
                  <FiStar className="h-4 w-4" /> Nilai Plus (Nice-to-Have)
                </h3>
                {p.niceToHaveSkills.length === 0 ? (
                  <p className="scrawl text-muted text-sm">Tidak ada skill khusus yang ditandai sebagai nilai plus.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {p.niceToHaveSkills.map((skill) => (
                      <span
                        key={skill}
                        className="label bg-blue/15 border border-blue/40 text-blue rounded-md px-2.5 py-1 text-xs font-bold"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <div className="space-y-4">
              {p.requirements.length > 0 && (
                <Card rotate={-0.4}>
                  <h3 className="label text-xs font-bold uppercase tracking-wider text-muted mb-3">
                    Persyaratan Detail Pekerjaan
                  </h3>
                  <ul className="space-y-2 list-disc pl-4 text-sm leading-relaxed">
                    {p.requirements.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="raw">
          <Card tape="blue">
            <h3 className="label text-xs font-bold uppercase tracking-wider text-muted mb-2">
              Teks Mentah Asli Lowongan
            </h3>
            <pre className="p-4 rounded-xl border-2 border-line bg-paper text-xs font-mono whitespace-pre-wrap max-h-[35rem] overflow-auto leading-relaxed shadow-inner">
              {job.rawText}
            </pre>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
