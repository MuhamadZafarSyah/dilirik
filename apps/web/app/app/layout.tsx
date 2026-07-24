import type { ReactNode } from "react"
import { QuotaPill } from "@/components/nav/quota-pill"
import { Sidebar } from "@/components/nav/sidebar"

/**
 * Shell area privat /app — sidebar kiri + header dengan kuota selalu terlihat
 * (Prinsip UX #5: navigasi konsisten; Flow E: sisa kuota selalu tampak).
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="paper-texture flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-line bg-panel/40 flex items-center justify-end gap-3 border-b-2 px-4 py-3 md:px-8">
          <QuotaPill />
        </header>
        <main className="mx-auto w-full max-w-shell flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  )
}
