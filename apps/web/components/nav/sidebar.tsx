"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  FiBarChart2,
  FiBriefcase,
  FiFileText,
  FiLayers,
  FiLogOut,
  FiMic,
  FiSettings,
  FiZap,
  FiGlobe,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi"
import { signOut } from "@/lib/auth-client"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"

const ROTATIONS = [-1.2, 0.8, -0.6, 1.2, -0.8, 0.6, -1.0]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { lang, setLang, t } = useI18n()
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem("dilirik-sidebar-collapsed")
    if (saved !== null) {
      setCollapsed(saved === "true")
    }
  }, [])

  const toggleCollapse = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem("dilirik-sidebar-collapsed", String(next))
  }

  const items = [
    { href: "/app", label: t("dashboard"), icon: FiBarChart2, exact: true },
    { href: "/app/cv", label: t("cv"), icon: FiFileText },
    { href: "/app/jobs", label: t("jobs"), icon: FiBriefcase },
    { href: "/app/analyze", label: t("analyze"), icon: FiZap },
    { href: "/app/interview", label: t("interview"), icon: FiMic },
    { href: "/app/applications", label: t("applications"), icon: FiLayers },
    { href: "/app/settings", label: t("settings"), icon: FiSettings },
  ]

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 80 : 256 }}
      transition={{ type: "spring", stiffness: 350, damping: 30 }}
      className={cn(
        "border-line bg-panel/70 relative flex h-auto w-full flex-col border-b-2 p-3 backdrop-blur-md md:sticky md:top-0 md:h-screen md:border-b-0 md:border-r-2 shrink-0 md:p-4"
      )}
    >
      {/* Brand logo & Collapse Toggle Button */}
      <div className={cn("flex items-center mb-3 md:mb-6", collapsed ? "justify-center flex-col gap-3 px-0" : "justify-between px-2")}>
        <Link href="/" className="group flex items-center gap-2 overflow-hidden" title="Dilirik">
          <motion.div
            whileHover={{ rotate: 12, scale: 1.1 }}
            className="bg-ink text-paper flex h-9 w-9 items-center justify-center rounded-lg shadow-paper font-bold text-lg shrink-0"
          >
            👀
          </motion.div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col whitespace-nowrap overflow-hidden"
              >
                <span className="hand text-ink text-3xl leading-none font-bold">Dilirik</span>
                <span className="scrawl text-muted text-xs leading-none -mt-1">smart CV matcher</span>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>

        {/* Desktop Collapse Toggle Button */}
        <button
          onClick={toggleCollapse}
          className="hidden md:flex items-center justify-center h-7 w-7 rounded-lg border border-line bg-paper text-muted hover:text-ink hover:border-ink transition-colors shadow-xs shrink-0"
          title={collapsed ? "Perluas Sidebar" : "Ciutkan Sidebar"}
        >
          {collapsed ? <FiChevronRight className="h-4 w-4" /> : <FiChevronLeft className="h-4 w-4" />}
        </button>

        {/* Mobile Language switch button */}
        <button
          onClick={() => setLang(lang === "id" ? "en" : "id")}
          className="label text-muted hover:text-ink flex items-center gap-1 rounded-md border border-line bg-paper px-2 py-1 text-xs font-bold shadow-xs md:hidden"
          title="Ganti Bahasa"
        >
          <FiGlobe className="h-3.5 w-3.5" />
          <span className="uppercase">{lang}</span>
        </button>
      </div>

      {/* Navigation items */}
      <nav className="flex flex-1 flex-row gap-1.5 overflow-x-auto pb-1 md:flex-col md:pb-0 md:overflow-visible scrollbar-none relative">
        {items.map(({ href, label, icon: Icon, exact }, index) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          const rotateDeg = ROTATIONS[index % ROTATIONS.length]

          return (
            <div key={href} className="relative group">
              <Link
                href={href}
                className={cn(
                  "label relative flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-bold whitespace-nowrap transition-colors select-none",
                  collapsed && "md:justify-center md:px-0 md:w-full",
                  active ? "text-paper z-10" : "text-ink hover:bg-line/30"
                )}
              >
                {active && (
                  <motion.div
                    layoutId="activeSidebarBg"
                    initial={false}
                    animate={{ rotate: rotateDeg }}
                    className="absolute inset-0 bg-ink rounded-xl shadow-paper z-0 pointer-events-none"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <Icon className={cn("h-4 w-4 shrink-0 z-10", active ? "text-yellow" : "text-muted")} />

                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.15 }}
                      className="z-10 overflow-hidden whitespace-nowrap"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>

                {active && !collapsed && (
                  <motion.span
                    layoutId="activeSidebarDot"
                    className="bg-yellow absolute right-3.5 h-2 w-2 rounded-full hidden md:block z-10 pointer-events-none"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
              </Link>

              {/* Floating Tooltip when Collapsed */}
              {collapsed && (
                <div className="absolute  left-full top-1/2 -translate-y-1/2 ml-3 hidden md:group-hover:flex items-center px-3 py-1.5 bg-ink text-paper text-xs font-bold rounded-xl shadow-paper border border-line whitespace-nowrap z-[100] pointer-events-none -rotate-1">
                  {label}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Footer controls (desktop) */}
      <div className={cn("hidden md:flex flex-col gap-2 pt-4 border-t border-line mt-auto overflow-hidden", collapsed && "items-center px-0")}>
        <div className={cn("flex items-center justify-between w-full", collapsed ? "justify-center" : "px-2")}>
          <button
            onClick={() => setLang(lang === "id" ? "en" : "id")}
            className={cn(
              "label text-muted hover:text-ink flex items-center gap-1.5 rounded-lg border border-line bg-paper py-1.5 text-xs font-bold shadow-xs transition-colors",
              collapsed ? "px-2 justify-center" : "px-3 w-full"
            )}
            title={collapsed ? (lang === "id" ? "Bahasa Indonesia" : "English") : undefined}
          >
            <FiGlobe className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="uppercase truncate">{lang === "id" ? "Bahasa Indonesia" : "English"}</span>}
          </button>
        </div>

        <button
          onClick={async () => {
            await signOut()
            router.push("/")
          }}
          className={cn(
            "label text-muted hover:text-red hover:bg-red/10 flex items-center gap-2.5 rounded-xl text-sm font-bold transition-colors",
            collapsed ? "justify-center p-2.5 w-full" : "px-3.5 py-2"
          )}
          title={collapsed ? t("logout") : undefined}
        >
          <FiLogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="whitespace-nowrap">{t("logout")}</span>}
        </button>
      </div>
    </motion.aside>
  )
}
