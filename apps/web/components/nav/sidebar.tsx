"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { motion } from "framer-motion"
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
} from "react-icons/fi"
import { signOut } from "@/lib/auth-client"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { lang, setLang, t } = useI18n()

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
    <aside className="border-line bg-panel/70 relative flex h-auto w-full flex-col border-b-2 p-3 backdrop-blur-md md:sticky md:top-0 md:h-screen md:w-64 md:border-b-0 md:border-r-2 md:p-5 shrink-0">
      {/* Brand logo */}
      <div className="flex items-center justify-between px-2 mb-3 md:mb-8">
        <Link href="/" className="group flex items-center gap-2">
          <motion.div
            whileHover={{ rotate: 12, scale: 1.1 }}
            className="bg-ink text-paper flex h-9 w-9 items-center justify-center rounded-lg shadow-paper font-bold text-lg"
          >
            👀
          </motion.div>
          <div className="flex flex-col">
            <span className="hand text-ink text-3xl leading-none font-bold">Dilirik</span>
            <span className="scrawl text-muted text-xs leading-none -mt-1">smart CV matcher</span>
          </div>
        </Link>

        {/* Language switch button */}
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
      <nav className="flex flex-1 flex-row gap-1.5 overflow-x-auto pb-1 md:flex-col md:pb-0 scrollbar-none relative">
        {items.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "label relative flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-bold whitespace-nowrap transition-colors select-none",
                active ? "text-paper z-10" : "text-ink hover:bg-line/30"
              )}
            >
              {active && (
                <motion.div
                  layoutId="activeSidebarBg"
                  className="absolute inset-0 bg-ink rounded-xl shadow-paper -rotate-1 z-0 pointer-events-none"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <Icon className={cn("h-4 w-4 shrink-0 z-10", active ? "text-yellow" : "text-muted")} />
              <span className="z-10">{label}</span>
              {active && (
                <motion.span
                  layoutId="activeSidebarDot"
                  className="bg-yellow absolute right-3.5 h-2 w-2 rounded-full hidden md:block z-10 pointer-events-none"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer controls (desktop) */}
      <div className="hidden md:flex flex-col gap-2 pt-4 border-t border-line mt-auto">
        <div className="flex items-center justify-between px-2">
          <button
            onClick={() => setLang(lang === "id" ? "en" : "id")}
            className="label text-muted hover:text-ink flex items-center gap-1.5 rounded-lg border border-line bg-paper px-3 py-1.5 text-xs font-bold shadow-xs"
          >
            <FiGlobe className="h-4 w-4" />
            <span className="uppercase">{lang === "id" ? "Bahasa Indonesia" : "English"}</span>
          </button>
        </div>

        <button
          onClick={async () => {
            await signOut()
            router.push("/")
          }}
          className="label text-muted hover:text-red hover:bg-red/10 flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-sm font-bold transition-colors"
        >
          <FiLogOut className="h-4 w-4" />
          <span>{t("logout")}</span>
        </button>
      </div>
    </aside>
  )
}
