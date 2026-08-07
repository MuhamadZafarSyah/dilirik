"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { FiFileText, FiPlus, FiZap, FiSearch, FiArrowRight, FiTrash2 } from "react-icons/fi"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api, errorMessage } from "@/lib/api"
import { Skeleton } from "boneyard-js/react"
import { Polaroid } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { EmptyState } from "@/components/ui/empty-state"
import { useToast } from "@/components/ui/toast"
import { useI18n } from "@/lib/i18n"

type CvItem = {
  id: string
  title: string
  language: string
  version: number
  parentCvId: string | null
  createdAt: string
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

const itemVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 15 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 280, damping: 22 } },
}

export default function CvListPage() {
  const { t } = useI18n()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [cvToDelete, setCvToDelete] = useState<CvItem | null>(null)

  const cvsQuery = useQuery({
    queryKey: ["cvs"],
    queryFn: async () => {
      const { data } = await api.get<{ cvs: CvItem[] }>("/api/cv")
      return data.cvs
    },
  })
  const cvs = cvsQuery.data ?? (cvsQuery.isError ? [] : null)

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/cv/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cvs"] })
      toast("Dokumen CV berhasil dihapus.", "success")
    },
    onError: (err) => toast(errorMessage(err), "error"),
  })

  const roots = cvs?.filter((cv) => !cv.parentCvId) ?? []
  const versionsOf = (rootId: string) => cvs?.filter((cv) => cv.parentCvId === rootId) ?? []
  const filteredRoots = roots.filter((cv) =>
    cv.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="hand text-4xl sm:text-5xl font-bold flex items-center gap-2">
            Dokumen CV 📄
          </h1>
          <p className="scrawl text-muted text-xl mt-1">Kelola master CV dan versi revisi hasil AI.</p>
        </div>

        <Link href="/app/cv/new">
          <Button variant="primary" size="lg" icon={<FiPlus />} tape="yellow">
            + Tambah Master CV
          </Button>
        </Link>
      </motion.div>

      <Skeleton name="cv-list" loading={!cvs} animate="shimmer" fallback={<CvListSkeleton />}>
        {cvs ? (
          roots.length === 0 ? (
            <motion.div variants={itemVariants}>
              <EmptyState
                title={t("emptyCvTitle")}
                note="Upload PDF/DOCX atau tempel teks CV kamu — Bahasa Indonesia maupun Inggris."
                ctaLabel={t("emptyCvCta")}
                ctaHref="/app/cv/new"
              />
            </motion.div>
          ) : filteredRoots.length === 0 ? (
            <motion.div variants={itemVariants} className="text-center py-12">
              <p className="scrawl text-muted text-2xl">CV yang kamu cari tidak ditemukan 🔍</p>
            </motion.div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              {filteredRoots.map((cv, i) => {
                const versions = versionsOf(cv.id)
                const tapeColor = i % 3 === 0 ? "yellow" : i % 3 === 1 ? "blue" : "red"
                return (
                  <motion.div
                    key={cv.id}
                    variants={itemVariants}
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  >
                    <Polaroid tape={tapeColor} pin rotate={i % 2 === 0 ? -1.5 : 1.5} className="group h-full flex flex-col justify-between">
                      <div>
                        <Link href={`/app/cv/${cv.id}`} className="block">
                          <div className="bg-paper/80 border-line flex h-36 items-center justify-center rounded-lg border-2 shadow-inner group-hover:bg-paper transition-colors relative overflow-hidden">
                            <FiFileText className="h-14 w-14 text-ink/70 group-hover:scale-110 transition-transform" />
                            <span className="label bg-ink text-paper absolute top-2 right-2 rounded-full px-2 py-0.5 text-[10px] uppercase font-bold">
                              {cv.language}
                            </span>
                          </div>

                          <div className="mt-4">
                            <h3 className="hand text-2xl font-bold text-ink group-hover:text-red transition-colors line-clamp-1">
                              {cv.title}
                            </h3>
                            <p className="label text-muted text-xs uppercase tracking-wider mt-1">
                              v{cv.version} Master · {new Date(cv.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                          </div>
                        </Link>

                        {versions.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-line/60">
                            <p className="scrawl text-muted text-xs mb-1.5 font-bold">Riwayat Revisi:</p>
                            <div className="flex flex-wrap gap-1.5">
                              {versions.map((v) => (
                                <Link
                                  key={v.id}
                                  href={`/app/cv/${v.id}`}
                                  className="label bg-yellow/30 border border-yellow/80 hover:bg-yellow text-ink rounded-md px-2 py-0.5 text-[11px] font-bold transition-colors"
                                >
                                  v{v.version} (Revisi)
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-1 text-xs font-bold pt-3 border-t border-line/60">
                        <Link href={`/app/analyze?cvId=${cv.id}`} className="label text-red hover:underline flex items-center gap-1">
                          <FiZap /> Analisis
                        </Link>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={<FiTrash2 />}
                            onClick={() => setCvToDelete(cv)}
                            className="text-red hover:bg-red/10"
                            title="Hapus Master CV"
                          >
                            Hapus
                          </Button>
                          <Link href={`/app/cv/${cv.id}`}>
                            <Button size="sm" variant="outline" icon={<FiArrowRight />}>
                              Detail
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </Polaroid>
                  </motion.div>
                )
              })}
            </motion.div>
          )
        ) : null}
      </Skeleton>

      {/* Konfirmasi Hapus Master CV */}
      <ConfirmDialog
        open={cvToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setCvToDelete(null)
        }}
        title="Hapus master CV ini?"
        description={
          cvToDelete
            ? `Master CV "${cvToDelete.title}" beserta seluruh versi revisinya akan dihapus permanen.`
            : "Dokumen CV ini akan dihapus permanen."
        }
        confirmLabel="Ya, hapus CV"
        onConfirm={async () => {
          if (cvToDelete) await deleteMutation.mutateAsync(cvToDelete.id).catch(() => {})
        }}
      />
    </motion.div>
  )
}

function CvListSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border-2 border-line bg-panel/60 p-6 rounded-2xl space-y-4 shadow-paper">
            <div className="h-36 bg-line/30 rounded-lg" />
            <div className="h-7 w-3/4 bg-line/40 rounded-lg" />
            <div className="h-4 w-1/2 bg-line/25 rounded-md" />
            <div className="flex justify-between pt-2">
              <div className="h-8 w-24 bg-line/40 rounded-lg" />
              <div className="h-8 w-24 bg-line/40 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
