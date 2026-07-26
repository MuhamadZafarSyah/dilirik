"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  type ApplicationStatus,
} from "@dilirik/shared"
import { Skeleton } from "boneyard-js/react"
import { api, errorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n"
import { useToast } from "@/components/ui/toast"
import { EmptyState } from "@/components/ui/empty-state"
import { KanbanCard, type KanbanItem } from "./kanban-card"

/** Titik warna header kolom — selaras dengan StatusBadge. */
const columnDot: Record<ApplicationStatus, string> = {
  DISIMPAN: "bg-muted",
  DILAMAR: "bg-blue",
  SCREENING: "bg-yellow",
  INTERVIEW: "bg-blue",
  OFFER: "bg-green",
  DITOLAK: "bg-red",
}

/** Rotasi acak-tapi-deterministik biar papan terasa hand-made, bukan grid kaku. */
const rotations = [-1.4, 0.9, -0.5, 1.3, -0.9, 0.6]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
}

const columnVariants = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 24 } },
}

type DragState = { id: string; from: ApplicationStatus } | null

export function KanbanBoard() {
  const { lang, t } = useI18n()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [dragging, setDragging] = useState<DragState>(null)
  const [overCol, setOverCol] = useState<ApplicationStatus | null>(null)

  const itemsQuery = useQuery({
    queryKey: ["applications", ""],
    queryFn: async () => {
      const { data } = await api.get<{ applications: KanbanItem[] }>("/api/applications")
      return data.applications
    },
  })
  const items = itemsQuery.data ?? (itemsQuery.isError ? [] : null)

  // Optimistic update: kartu langsung pindah kolom, rollback bila server menolak.
  const moveMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ApplicationStatus }) => {
      const { data } = await api.patch(`/api/applications/${id}`, { status })
      return data.application
    },
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ["applications"] })
      const prev = qc.getQueryData<KanbanItem[]>(["applications", ""])
      qc.setQueryData<KanbanItem[]>(["applications", ""], (old) =>
        old?.map((it) =>
          it.id === id ? { ...it, status, updatedAt: new Date().toISOString() } : it
        )
      )
      return { prev }
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["applications", ""], ctx.prev)
      toast(errorMessage(err), "error")
    },
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: ["applications"] })
      qc.invalidateQueries({ queryKey: ["application", vars.id] })
    },
  })

  const grouped = useMemo(() => {
    const map = Object.fromEntries(
      APPLICATION_STATUSES.map((s) => [s, [] as KanbanItem[]])
    ) as Record<ApplicationStatus, KanbanItem[]>
    for (const it of items ?? []) map[it.status]?.push(it)
    return map
  }, [items])

  const move = (item: KanbanItem, status: ApplicationStatus | undefined) => {
    if (!status || item.status === status) return
    moveMutation.mutate({ id: item.id, status })
  }

  const handleDrop = (e: React.DragEvent, status: ApplicationStatus) => {
    e.preventDefault()
    const id = e.dataTransfer.getData("text/plain") || dragging?.id
    const from = dragging?.from
    setOverCol(null)
    setDragging(null)
    if (!id || from === status) return
    moveMutation.mutate({ id, status })
  }

  return (
    <Skeleton name="applications-kanban" loading={!items} animate="shimmer" fallback={<KanbanSkeleton />}>
      {items ? (
        items.length === 0 ? (
          <EmptyState
            title="Papan Masih Kosong"
            note="Jalankan sesi analisis CV + lowongan, lalu simpan ke tracker — kartunya bakal nempel di papan ini."
            ctaLabel={t("newAnalysis")}
            ctaHref="/app/analyze"
          />
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex snap-x items-start gap-4 overflow-x-auto pb-6"
          >
            {APPLICATION_STATUSES.map((status, colIdx) => {
              const colItems = grouped[status]
              const isOver = overCol === status && dragging !== null && dragging.from !== status
              return (
                <motion.section
                  key={status}
                  variants={columnVariants}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = "move"
                    if (overCol !== status) setOverCol(status)
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node | null))
                      setOverCol((c) => (c === status ? null : c))
                  }}
                  onDrop={(e) => handleDrop(e, status)}
                  className={cn(
                    "w-[264px] shrink-0 snap-start rounded-2xl border-2 bg-panel/70 shadow-paper backdrop-blur-xs transition-all duration-150",
                    isOver ? "scale-[1.02] border-dashed border-ink/60 bg-yellow/10" : "border-line"
                  )}
                >
                  <header className="flex items-center justify-between gap-2 border-b-2 border-dashed border-line px-4 py-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", columnDot[status])} aria-hidden />
                      <h2 className="label truncate text-xs font-bold uppercase tracking-wider text-ink">
                        {APPLICATION_STATUS_LABELS[status][lang]}
                      </h2>
                    </div>
                    <span className="hand shrink-0 text-lg font-bold text-muted">{colItems.length}</span>
                  </header>

                  <div className="min-h-[280px] space-y-3 p-3">
                    {colItems.map((item, i) => (
                      <KanbanCard
                        key={item.id}
                        item={item}
                        rotate={rotations[(i + colIdx) % rotations.length]!}
                        isDragging={dragging?.id === item.id}
                        onDragStart={() => setDragging({ id: item.id, from: status })}
                        onDragEnd={() => {
                          setDragging(null)
                          setOverCol(null)
                        }}
                        onMovePrev={
                          colIdx > 0 ? () => move(item, APPLICATION_STATUSES[colIdx - 1]) : undefined
                        }
                        onMoveNext={
                          colIdx < APPLICATION_STATUSES.length - 1
                            ? () => move(item, APPLICATION_STATUSES[colIdx + 1])
                            : undefined
                        }
                      />
                    ))}

                    {colItems.length === 0 && (
                      <div
                        className={cn(
                          "grid h-40 place-items-center rounded-xl border-2 border-dashed transition-colors",
                          isOver ? "border-ink/60 bg-yellow/15" : "border-line/80"
                        )}
                      >
                        <p className="scrawl px-3 text-center text-lg text-muted">
                          {dragging ? "Taruh di sini ✋" : "Belum ada kartu"}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.section>
              )
            })}
          </motion.div>
        )
      ) : null}
    </Skeleton>
  )
}

function KanbanSkeleton() {
  return (
    <div className="flex animate-pulse items-start gap-4 overflow-hidden pb-6">
      {[1, 2, 3, 4, 5, 6].map((col) => (
        <div key={col} className="w-[264px] shrink-0 rounded-2xl border-2 border-line bg-panel/60 shadow-paper">
          <div className="flex items-center justify-between border-b-2 border-dashed border-line px-4 py-3">
            <div className="h-4 w-20 rounded-md bg-line/40" />
            <div className="h-5 w-5 rounded-md bg-line/30" />
          </div>
          <div className="space-y-3 p-3">
            {Array.from({ length: ((col * 2) % 3) + 1 }).map((_, i) => (
              <div key={i} className="h-24 rounded-sm border-l-4 border-line bg-line/20" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
