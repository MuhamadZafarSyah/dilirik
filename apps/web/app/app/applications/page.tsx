"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { FiArrowLeft, FiSearch, FiZap, FiPlus, FiFilter, FiCheckSquare } from "react-icons/fi"
import { Button } from "@/components/ui/button"
import { KanbanBoard } from "@/components/applications/kanban-board"
import { useI18n } from "@/lib/i18n"

export default function ApplicationsPage() {
  const router = useRouter()
  const { lang, t } = useI18n()
  const [search, setSearch] = useState("")

  return (
    <div className="fixed inset-0 z-[100] bg-paper flex flex-col h-screen w-screen overflow-hidden text-ink">
      {/* Top Header Bar — Native Desktop App Bar */}
      <header className="h-16 px-4 md:px-6 border-b-2 border-line bg-panel flex items-center justify-between gap-4 shrink-0 shadow-xs">
        <div className="flex items-center gap-4 min-w-0">
          <Button
            variant="outline"
            size="sm"
            icon={<FiArrowLeft />}
            onClick={() => router.back()}
            className="shrink-0"
          >
            {lang === "id" ? "Kembali" : "Back"}
          </Button>

          <div className="flex items-center gap-2 min-w-0">
            <h1 className="hand text-2xl font-bold text-ink truncate">
              Tracker Lamaran Kanban 📌
            </h1>
          </div>
        </div>

        {/* Middle Search */}
        <div className="hidden md:flex items-center gap-3 flex-1 max-w-xl">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted h-4 w-4" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={lang === "id" ? "Cari nama posisi, perusahaan, atau CV..." : "Search task, company, or CV..."}
              className="w-[80%] pl-9 pr-3 py-1.5 rounded-xl border-2 border-line bg-paper text-ink text-xs font-bold outline-none focus:border-ink shadow-inner"
            />
          </div>
        </div>

        {/* Right Action Button */}
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/app/analyze">
            <Button variant="danger" size="sm" icon={<FiZap />} tape="red">
              + {t("newAnalysis")}
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Dedicated Kanban Workspace */}
      <main className="h-[calc(100vh-64px)] w-full p-4 md:p-6 overflow-hidden flex flex-col">
        <KanbanBoard searchQuery={search} />
      </main>
    </div>
  )
}
