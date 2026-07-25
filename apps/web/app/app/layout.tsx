import type { ReactNode } from "react"
import { QuotaPill } from "@/components/nav/quota-pill"
import { Sidebar } from "@/components/nav/sidebar"
import { QueryProvider } from "@/components/providers/query-provider"
import { ToastProvider } from "@/components/ui/toast"

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <ToastProvider>
        <div className="paper-texture flex min-h-screen flex-col md:flex-row">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="border-line bg-panel/50 flex items-center justify-between gap-3 border-b-2 px-4 py-3 md:px-8 backdrop-blur-xs">
              <div className="md:hidden flex items-center gap-2">
                <span className="hand text-2xl font-bold">Dilirik 👀</span>
              </div>
              <div className="flex items-center gap-3 ml-auto">
                <QuotaPill />
              </div>
            </header>
            <main className="mx-auto w-full max-w-shell flex-1 p-4 md:p-8">{children}</main>
          </div>
        </div>
      </ToastProvider>
    </QueryProvider>
  )
}
