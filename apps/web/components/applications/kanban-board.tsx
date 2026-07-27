"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
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

/** Header column background colors matching native Kanban app reference. */
const columnHeaderBg: Record<ApplicationStatus, string> = {
  DISIMPAN: "bg-blue/20 text-blue border-blue/40",
  DILAMAR: "bg-yellow/30 text-ink border-yellow/60",
  SCREENING: "bg-purple/20 text-purple border-purple/40",
  INTERVIEW: "bg-blue/30 text-blue border-blue/60",
  OFFER: "bg-green/20 text-green border-green/50",
  DITOLAK: "bg-red/20 text-red border-red/40",
}

const columnDot: Record<ApplicationStatus, string> = {
  DISIMPAN: "bg-blue-500",
  DILAMAR: "bg-yellow-500",
  SCREENING: "bg-purple-500",
  INTERVIEW: "bg-blue-600",
  OFFER: "bg-green-500",
  DITOLAK: "bg-red-500",
}

const rotations = [-1.2, 0.8, -0.6, 1.2, -0.8, 0.6]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

const columnVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 350, damping: 25 } },
}

const LOCAL_STORAGE_KEY = "dilirik_kanban_order"

function getSavedOrder(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveOrder(ids: string[]) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(ids))
  } catch { }
}

type DragState = { id: string; from: ApplicationStatus } | null
type DropTarget = { cardId: string; position: "before" | "after" } | null

export function KanbanBoard({ searchQuery }: { searchQuery?: string }) {
  const { lang, t } = useI18n()
  const { toast } = useToast()
  const qc = useQueryClient()

  const [dragging, setDragging] = useState<DragState>(null)
  const [overCol, setOverCol] = useState<ApplicationStatus | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget>(null)
  const [orderIds, setOrderIds] = useState<string[]>(getSavedOrder)

  const itemsQuery = useQuery({
    queryKey: ["applications", ""],
    queryFn: async () => {
      const { data } = await api.get<{ applications: KanbanItem[] }>("/api/applications")
      return data.applications
    },
  })
  const rawItems = itemsQuery.data ?? (itemsQuery.isError ? [] : null)

  const orderedItems = useMemo(() => {
    if (!rawItems) return null
    const map = new Map(rawItems.map((item) => [item.id, item]))
    const result: KanbanItem[] = []

    // Preserve custom orderIds sequence
    for (const id of orderIds) {
      const item = map.get(id)
      if (item) {
        result.push(item)
        map.delete(id)
      }
    }

    // Append any new items not yet in orderIds
    for (const item of map.values()) {
      result.push(item)
    }

    return result
  }, [rawItems, orderIds])

  const items = useMemo(() => {
    if (!orderedItems) return null
    if (!searchQuery) return orderedItems
    const q = searchQuery.toLowerCase()
    return orderedItems.filter((item) => {
      const title = (item.jobPosting.parsedJson.jobTitle || "").toLowerCase()
      const company = (item.jobPosting.parsedJson.company || "").toLowerCase()
      const cvTitle = (item.cv.title || "").toLowerCase()
      return title.includes(q) || company.includes(q) || cvTitle.includes(q)
    })
  }, [orderedItems, searchQuery])

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

  const applyCardDrop = (
    sourceId: string,
    targetStatus: ApplicationStatus,
    targetCardId?: string,
    position?: "before" | "after"
  ) => {
    if (!orderedItems) return
    const sourceItem = orderedItems.find((it) => it.id === sourceId)
    if (!sourceItem) return

    const currentIds = orderedItems.map((it) => it.id)
    const filteredIds = currentIds.filter((id) => id !== sourceId)

    let newOrderIds: string[] = []
    if (targetCardId && position) {
      const targetIndex = filteredIds.indexOf(targetCardId)
      if (targetIndex !== -1) {
        const insertIndex = position === "after" ? targetIndex + 1 : targetIndex
        filteredIds.splice(insertIndex, 0, sourceId)
        newOrderIds = filteredIds
      } else {
        filteredIds.push(sourceId)
        newOrderIds = filteredIds
      }
    } else {
      const colItemIds = orderedItems
        .filter((it) => it.status === targetStatus && it.id !== sourceId)
        .map((it) => it.id)

      if (colItemIds.length > 0) {
        const lastColItemId = colItemIds[colItemIds.length - 1]
        const lastIdx = filteredIds.indexOf(lastColItemId!)
        filteredIds.splice(lastIdx + 1, 0, sourceId)
        newOrderIds = filteredIds
      } else {
        filteredIds.push(sourceId)
        newOrderIds = filteredIds
      }
    }

    setOrderIds(newOrderIds)
    saveOrder(newOrderIds)

    const statusChanged = sourceItem.status !== targetStatus
    if (statusChanged) {
      qc.setQueryData<KanbanItem[]>(["applications", ""], (old) =>
        old?.map((it) => (it.id === sourceId ? { ...it, status: targetStatus } : it))
      )
      moveMutation.mutate({ id: sourceId, status: targetStatus })
    }
  }

  const move = (item: KanbanItem, status: ApplicationStatus | undefined) => {
    if (!status || item.status === status) return
    applyCardDrop(item.id, status)
  }

  const handleColumnDrop = (e: React.DragEvent, status: ApplicationStatus) => {
    e.preventDefault()
    const id = e.dataTransfer.getData("text/plain") || dragging?.id
    setOverCol(null)
    setDragging(null)
    setDropTarget(null)
    if (!id) return
    applyCardDrop(id, status)
  }

  const handleCardDrop = (
    e: React.DragEvent,
    targetItem: KanbanItem,
    position: "before" | "after"
  ) => {
    e.preventDefault()
    e.stopPropagation()
    const id = e.dataTransfer.getData("text/plain") || dragging?.id
    setOverCol(null)
    setDragging(null)
    setDropTarget(null)
    if (!id || id === targetItem.id) return
    applyCardDrop(id, targetItem.status, targetItem.id, position)
  }

  return (
    <div className="h-screen! w-full flex flex-col flex-1 min-h-0">
      <Skeleton
        name="applications-kanban"
        loading={!items}
        animate="shimmer"
        className="boneyard-kanban-container h-screen! w-full flex flex-col flex-1 min-h-0"
        fallback={<KanbanSkeleton />}
      >
        {items ? (
          items.length === 0 ? (
            <EmptyState
              title="Papan Kanban Masih Kosong"
              note="Jalankan sesi analisis CV + lowongan, lalu simpan ke tracker — kartunya bakal otomatis nempel di papan ini."
              ctaLabel={t("newAnalysis")}
              ctaHref="/app/analyze"
            />
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="flex items-stretch gap-5 overflow-x-auto pb-4 custom-scrollbar w-full h-[85dvh]! flex-1 min-h-0"
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
                    onDrop={(e) => handleColumnDrop(e, status)}
                    className={cn(
                      "w-[310px] shrink-0 rounded-2xl border-2 bg-panel/80 shadow-paper backdrop-blur-xs flex flex-col h-full overflow-hidden transition-all duration-150",
                      isOver ? "scale-[1.01] border-dashed border-ink bg-yellow/10" : "border-line"
                    )}
                  >
                    {/* Column Header */}
                    <header className={cn("flex items-center justify-between gap-2 px-4 py-3 border-b border-line rounded-t-xl shrink-0", columnHeaderBg[status])}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", columnDot[status])} />
                        <h2 className="label text-xs font-bold uppercase tracking-wider ">
                          {APPLICATION_STATUS_LABELS[status][lang]}
                        </h2>
                      </div>
                      <h2 className="label text-xs font-bold uppercase tracking-wider truncate">
                        ({colItems.length})
                      </h2>
                    </header>

                    {/* Cards Container */}
                    <div className="flex-1 overflow-y-auto space-y-3 p-3 custom-scrollbar h-full min-h-0">
                      {colItems.map((item, i) => (
                        <KanbanCard
                          key={item.id}
                          item={item}
                          rotate={rotations[(i + colIdx) % rotations.length]!}
                          isDragging={dragging?.id === item.id}
                          dropIndicator={
                            dropTarget?.cardId === item.id ? dropTarget.position : null
                          }
                          onDragStart={() => setDragging({ id: item.id, from: status })}
                          onDragEnd={() => {
                            setDragging(null)
                            setOverCol(null)
                            setDropTarget(null)
                          }}
                          onDragOverCard={(_e, position) => {
                            if (dragging && dragging.id !== item.id) {
                              setDropTarget({ cardId: item.id, position })
                            }
                          }}
                          onDragLeaveCard={() => {
                            if (dropTarget?.cardId === item.id) {
                              setDropTarget(null)
                            }
                          }}
                          onDropOnCard={(e, position) => handleCardDrop(e, item, position)}
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
                            "grid h-36 place-items-center rounded-2xl border-2 border-dashed transition-colors",
                            isOver ? "border-ink bg-yellow/15" : "border-line/60"
                          )}
                        >
                          <p className="scrawl px-3 text-center text-base text-muted">
                            {dragging ? "Jatuhkan di sini ✋" : "Kosong"}
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
    </div>
  )
}

function KanbanSkeleton() {
  return (
    <div className="flex animate-pulse items-start gap-5 overflow-hidden pb-6 h-full w-full flex-1">
      {[1, 2, 3, 4, 5, 6].map((col) => (
        <div key={col} className="w-[310px] shrink-0 rounded-2xl border-2 border-line bg-panel/60 shadow-paper h-full flex flex-col">
          <div className="flex items-center justify-between border-b-2 border-line px-4 py-3 shrink-0">
            <div className="h-4 w-24 rounded-md bg-line/40" />
            <div className="h-4 w-4 rounded-md bg-line/30" />
          </div>
          <div className="space-y-3 p-3 flex-1 overflow-hidden">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl border-2 border-line bg-line/20" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
