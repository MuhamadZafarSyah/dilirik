"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  FiBarChart2, FiBriefcase, FiFileText, FiLayers, FiLogOut, FiSettings, FiZap,
} from "react-icons/fi"
import { signOut } from "@/lib/auth-client"
import { useI18n } from "@/lib/i18n"

/** Sidebar konsisten: Dashboard · CV · Lowongan · Analisis · Lamaran · Settings (Prinsip UX #5). */
export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useI18n()

  const items = [
    { href: "/app", label: t("dashboard"), icon: FiBarChart2, exact: true },
    { href: "/app/cv", label: t("cv"), icon: FiFileText },
    { href: "/app/jobs", label: t("jobs"), icon: FiBriefcase },
    { href: "/app/analyze", label: t("analyze"), icon: FiZap },
    { href: "/app/applications", label: t("applications"), icon: FiLayers },
    { href: "/app/settings", label: t("settings"), icon: FiSettings },
  ]

  return (
    <aside className="border-line bg-panel/60 flex h-full w-full flex-row gap-1 border-b-2 p-2 md:w-56 md:flex-col md:border-b-0 md:border-r-2 md:p-4">
      <Link href="/" className="hand text-ink mb-0 hidden px-2 text-3xl md:mb-6 md:block">
        Dilirik <span aria-hidden>👀</span>
      </Link>
      <nav className="flex flex-1 flex-row gap-1 overflow-x-auto md:flex-col">
        {items.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`label flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${
                active ? "bg-ink text-paper rotate-[-1deg]" : "text-ink hover:bg-line/40"
              }`}
            >
              <Icon aria-hidden /> {label}
            </Link>
          )
        })}
      </nav>
      <button
        onClick={async () => {
          await signOut()
          router.push("/")
        }}
        className="label text-muted hover:text-red flex items-center gap-2 rounded-md px-3 py-2 text-sm"
      >
        <FiLogOut aria-hidden /> <span className="hidden md:inline">{t("logout")}</span>
      </button>
    </aside>
  )
}
