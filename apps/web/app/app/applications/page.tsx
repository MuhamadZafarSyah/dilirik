"use client"

import Link from "next/link"
import { FiZap } from "react-icons/fi"
import { Button } from "@/components/ui/button"
import { KanbanBoard } from "@/components/applications/kanban-board"

export default function ApplicationsPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="hand flex items-center gap-2 text-4xl font-bold sm:text-5xl">
            Tracker Pelamaran 📌
          </h1>
          <p className="scrawl mt-1 text-xl text-muted">
            Seret kartu antar kolom untuk mengubah status — persis mindahin sticky note di papan.
          </p>
        </div>

        <Link href="/app/analyze">
          <Button variant="danger" icon={<FiZap />} tape="red">
            + Analisis & Tambah Lamaran
          </Button>
        </Link>
      </div>

      {/* Papan kanban — klik kartu untuk buka detail lamaran */}
      <KanbanBoard />
    </div>
  )
}
