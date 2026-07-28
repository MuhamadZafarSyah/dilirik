import type { ReactNode } from "react"
import { Suspense } from "react"
import { QuotaPill } from "@/components/nav/quota-pill"
import { Sidebar } from "@/components/nav/sidebar"
import { QueryProvider } from "@/components/providers/query-provider"
import { ToastProvider } from "@/components/ui/toast"
import { TopProgressBar } from "@/components/ui/top-progress-bar"
import Cursor from "@/components/ui/Cursor"

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <ToastProvider>
        <Suspense fallback={null}>
          <TopProgressBar />
        </Suspense>
        <div className="paper-texture flex min-h-screen flex-col md:flex-row">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="border-line bg-panel/50 hidden md:flex items-center justify-between gap-3 border-b-2 px-8 py-3 backdrop-blur-xs">
              <div className="flex items-center gap-3 ml-auto">
                <QuotaPill />
              </div>
            </header>
            <main className="mx-auto w-full max-w-shell flex-1 p-4 md:p-8">{children}</main>
          </div>
        </div>
        <Cursor />
      </ToastProvider>
    </QueryProvider>
  )
}
