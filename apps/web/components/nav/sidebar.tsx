"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { motion, AnimatePresence, LayoutGroup } from "framer-motion"
import {
  FiBarChart2,
  FiBriefcase,
  FiFileText,
  FiLayers,
  FiLogOut,
  FiMic,
  FiSettings,
  FiZap,
  FiChevronLeft,
  FiChevronRight,
  FiMenu,
  FiX,
} from "react-icons/fi"
import { signOut } from "@/lib/auth-client"
import { posthogKey } from "@/lib/analytics/config"
import { useI18n } from "@/lib/i18n"
import { QuotaPill } from "@/components/nav/quota-pill"
import { cn } from "@/lib/utils"

const ROTATIONS = [-1.2, 0.8, -0.6, 1.2, -0.8, 0.6, -1.0]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { lang, t } = useI18n()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem("dilirik-sidebar-collapsed")
    if (saved !== null) {
      setCollapsed(saved === "true")
    }
  }, [])

  // Auto close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const toggleCollapse = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem("dilirik-sidebar-collapsed", String(next))
  }

  const handleSignOut = async () => {
    const posthog = posthogKey ? (await import("posthog-js")).default : null
    posthog?.reset()
    await signOut()
    router.push("/")
  }

  const items = [
    { href: "/app", label: t("dashboard"), icon: FiBarChart2, exact: true },
    { href: "/app/cv", label: t("cv"), icon: FiFileText },
    { href: "/app/jobs", label: t("jobs"), icon: FiBriefcase },
    { href: "/app/analyze", label: t("analyze"), icon: FiZap },
    { href: "/app/interview", label: t("interview"), icon: FiMic },
    { href: "/app/cover-letters", label: t("coverLetter"), icon: FiFileText },
    { href: "/app/applications", label: t("applications"), icon: FiLayers },
    { href: "/app/settings", label: t("settings"), icon: FiSettings },
  ]

  const activeIndex = items.findIndex((item) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href)
  )

  const activeRotate = activeIndex !== -1 ? ROTATIONS[activeIndex % ROTATIONS.length] : 0

  return (
    <>
      {/* ===== MOBILE TOP APP BAR ===== */}
      <div className="border-line bg-panel/80 sticky top-0 z-40 flex items-center justify-between border-b-2 px-4 py-3 backdrop-blur-md md:hidden w-full shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex items-center justify-center p-2 rounded-xl border-2 border-line bg-paper text-ink font-bold shadow-xs active:scale-95 transition-transform"
            aria-label="Buka Menu Sidebar"
          >
            <FiMenu className="h-5 w-5" />
          </button>
          {/* <Link href="/app" className="flex items-center gap-2">
            <span className="bg-ink text-paper h-7 w-7 flex items-center justify-center rounded-lg font-bold text-xs shadow-xs">
              👀
            </span>
            <span className="hand text-ink text-2xl font-bold">Dilirik</span>
          </Link> */}
        </div>

        <div className="flex items-center gap-2">
          <QuotaPill />
        </div>
      </div>

      {/* ===== MOBILE SHEET DRAWER ===== */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-ink/60 backdrop-blur-xs z-50 md:hidden"
            />

            {/* Slide-out Drawer Panel */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 w-72 bg-panel border-r-2 border-line p-5 shadow-lift flex flex-col justify-between md:hidden"
            >
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <Link href="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
                    <div className="bg-ink text-paper h-9 w-9 flex items-center justify-center rounded-lg shadow-paper font-bold text-lg">
                      👀
                    </div>
                    <div className="flex flex-col">
                      <span className="hand text-ink text-3xl leading-none font-bold">Dilirik</span>
                      <span className="scrawl text-muted text-xs leading-none -mt-1">smart CV matcher</span>
                    </div>
                  </Link>

                  <button
                    onClick={() => setMobileOpen(false)}
                    className="p-2 border-2 border-line bg-paper rounded-xl text-muted hover:text-ink transition-colors shadow-xs"
                    aria-label="Tutup Menu"
                  >
                    <FiX className="h-5 w-5" />
                  </button>
                </div>

                {/* Navigation Items */}
                <nav className="flex flex-col gap-1.5 relative">
                  {/* Single Persistent Animated Active Pill */}
                  {activeIndex !== -1 && (
                    <motion.div
                      initial={false}
                      animate={{
                        top: activeIndex * 50,
                        rotate: activeRotate,
                      }}
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      className="absolute inset-x-0 h-[44px] bg-ink rounded-xl shadow-paper z-0 pointer-events-none"
                    />
                  )}

                  {items.map(({ href, label, icon: Icon, exact }, index) => {
                    const active = exact ? pathname === href : pathname.startsWith(href)

                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "label relative flex items-center gap-3 rounded-xl px-4 h-[44px] text-sm font-bold transition-colors select-none",
                          active ? "text-paper z-10" : "text-ink hover:bg-line/30"
                        )}
                      >
                        <Icon className={cn("h-4 w-4 shrink-0 z-10", active ? "text-yellow" : "text-muted")} />
                        <span className="z-10">{label}</span>
                        {active && (
                          <span className="bg-yellow absolute right-4 h-2 w-2 rounded-full z-10 pointer-events-none" />
                        )}
                      </Link>
                    )
                  })}
                </nav>
              </div>

              {/* Mobile Drawer Footer Controls */}
              <div className="flex flex-col gap-2 pt-4 border-t border-line">
                <button
                  onClick={async () => {
                    setMobileOpen(false)
                    await handleSignOut()
                  }}
                  className="label text-muted hover:text-red hover:bg-red/10 flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors"
                >
                  <FiLogOut className="h-4 w-4" />
                  <span>{t("logout")}</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ===== DESKTOP SIDEBAR ===== */}
      <aside
        className={cn(
          "hidden md:flex border-line bg-panel relative flex-col border-r-2 p-4 sticky top-0 h-screen shrink-0 transition-all duration-300 ease-in-out",
          collapsed ? "w-20" : "w-64"
        )}
      >
        {/* Brand logo & Collapse Toggle Button */}
        <div className={cn("flex items-center mb-6", collapsed ? "justify-center flex-col gap-3 px-0" : "justify-between px-2")}>
          <Link href="/" className="group flex items-center gap-2 overflow-hidden" title="Dilirik">
            <motion.div
              whileHover={{ rotate: 12, scale: 1.1 }}
              className="bg-ink text-paper flex h-9 w-9 items-center justify-center rounded-lg shadow-paper font-bold text-lg shrink-0"
            >
              👀
            </motion.div>
            {!collapsed && (
              <div className="flex flex-col whitespace-nowrap overflow-hidden">
                <span className="hand text-ink text-3xl leading-none font-bold">Dilirik</span>
                <span className="scrawl text-muted text-xs leading-none -mt-1">smart CV matcher</span>
              </div>
            )}
          </Link>

          {/* Desktop Collapse Toggle Button */}
          <button
            onClick={toggleCollapse}
            className="flex items-center justify-center h-7 w-7 rounded-lg border border-line bg-paper text-muted hover:text-ink hover:border-ink transition-colors shadow-xs shrink-0"
            title={collapsed ? "Perluas Sidebar" : "Ciutkan Sidebar"}
          >
            {collapsed ? <FiChevronRight className="h-4 w-4" /> : <FiChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation items */}
        <nav className="flex flex-col gap-1.5 flex-1 relative">
          {/* Single Persistent Animated Active Pill */}
          {activeIndex !== -1 && (
            <motion.div
              initial={false}
              animate={{
                top: activeIndex * 46,
                rotate: activeRotate,
              }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className="absolute inset-x-0 h-[40px] bg-ink rounded-xl shadow-paper z-0 pointer-events-none"
            />
          )}

          {/* Single Persistent Animated Yellow Dot */}
          {activeIndex !== -1 && !collapsed && (
            <motion.span
              initial={false}
              animate={{
                top: activeIndex * 46 + 16,
              }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className="bg-yellow absolute right-3.5 h-2 w-2 rounded-full hidden md:block z-10 pointer-events-none"
            />
          )}

          {items.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href)

            return (
              <div key={href} className="relative group">
                <Link
                  href={href}
                  className={cn(
                    "label relative flex items-center gap-2.5 rounded-xl px-3.5 h-[40px] text-sm font-bold whitespace-nowrap transition-colors select-none",
                    collapsed && "justify-center px-0 w-full",
                    active ? "text-paper z-10" : "text-ink hover:bg-line/30"
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0 z-10", active ? "text-yellow" : "text-muted")} />

                  {!collapsed && (
                    <span className="z-10 overflow-hidden whitespace-nowrap">
                      {label}
                    </span>
                  )}
                </Link>

                {/* Floating Tooltip when Collapsed */}
                {collapsed && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 hidden group-hover:flex items-center px-3 py-1.5 bg-ink text-paper text-xs font-bold rounded-xl shadow-paper border border-line whitespace-nowrap z-[100] pointer-events-none -rotate-1">
                    {label}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Footer controls (desktop) */}
        <div className={cn("flex flex-col gap-2 pt-4 border-t border-line mt-auto overflow-hidden", collapsed && "items-center px-0")}>
          <button
            onClick={handleSignOut}
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
      </aside>
    </>
  )
}
