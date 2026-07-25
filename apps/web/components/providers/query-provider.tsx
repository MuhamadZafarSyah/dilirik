"use client"

import { useState, type ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

/**
 * Provider TanStack Query untuk area /app.
 * - QueryClient dibuat di useState agar tidak dibuat ulang tiap render
 *   dan tidak bocor antar request saat SSR.
 * - Default konservatif: data dianggap segar 30 detik, retry 1x,
 *   tanpa refetch agresif saat pindah fokus window.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  )

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
