"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { useState } from "react"
import {
  FiBarChart2,
  FiBriefcase,
  FiFileText,
  FiLayers,
  FiLogOut,
  FiMail,
  FiMenu,
  FiMic,
  FiSettings,
  FiX,
  FiZap,
} from "react-icons/fi"
import { signOut } from "@/lib/auth-client"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { QuotaPill } from "./quota-pill"

const ROTATIONS = [-1.2, 0.8, -0.6, 1.2, -0.8, 0.6, -1.0, 0.9]

export function Sidebar() {
  const pathname = usePathname()
  const { t } = useI18n()
  const [open, setOpen] = useState(false)

  const items = [
    { href: "/app", label: t("dashboard"), icon: FiBarChart2, exact: true },
    { href: "/app/cv", label: t("cv"), icon: FiFileText },
    { href: "/app/jobs", label: t("jobs"), icon: FiBriefcase },
    { href: "/app/analyze", label: t("analyze"), icon: FiZap },
    { href: "/app/interview", label: t("interview"), icon: FiMic },
    // TODO(i18n): pakai t("coverLetter") setelah key ditambahkan di lib/i18n
    { href: "/app/cover-letter", label: "Cover Letter", icon: FiMail },
    { href: "/app/applications", label: t("applications"), icon: FiLayers },
    { href: "/app/settings", label: t("settings"), icon: FiSettings },
  ]

  const isActive = (item: (typeof items)[number]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href)

  const nav = (layoutPrefix: string) => (
    <nav className="flex flex-col gap-1">
      {items.map((item, i) => {
        const active = isActive(item)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              active ? "text-ink" : "text-muted hover:text-ink",
            )}
            style={{ rotate: `${ROTATIONS[i % ROTATIONS.length]}deg` }}
          >
            {active && (
              <motion.span
                layoutId={`${layoutPrefix}SidebarBg`}
                className="absolute inset-0 -z-10 rounded-lg bg-yellow/40 shadow-paper"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            <span className="hand">{item.label}</span>
            {active && (
              <motion.span
                layoutId="activeSidebarDot"
                className="ml-auto h-1.5 w-1.5 rounded-full bg-red"
              />
            )}
          </Link>
        )
      })}
    </nav>
  )

  return (
    <>
      {/* Desktop */}
      <aside className="hidden w-60 shrink-0 flex-col gap-6 border-r border-line bg-panel/60 p-4 md:flex">
        <Link href="/app" className="scrawl text-2xl text-ink">
          Dilirik
        </Link>
        {nav("active")}
        <div className="mt-auto flex flex-col gap-3">
          <QuotaPill />
          <button
            type="button"
            onClick={() => signOut()}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:text-red"
          >
            <FiLogOut className="h-4 w-4" aria-hidden />
            <span className="hand">Keluar</span>
          </button>
        </div>
      </aside>

      {/* Mobile */}
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
          className="fixed bottom-4 right-4 z-50 rounded-full border border-line bg-panel p-3 shadow-lift"
        >
          {open ? <FiX className="h-5 w-5" /> : <FiMenu className="h-5 w-5" />}
        </button>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed inset-x-0 bottom-0 z-40 rounded-t-2xl border-t border-line bg-panel p-4 shadow-lift"
          >
            {nav("mobile")}
            <button
              type="button"
              onClick={() => signOut()}
              className="mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted"
            >
              <FiLogOut className="h-4 w-4" aria-hidden />
              <span className="hand">Keluar</span>
            </button>
          </motion.div>
        )}
      </div>
    </>
  )
}
