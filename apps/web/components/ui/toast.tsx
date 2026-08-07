"use client"

import { useState, createContext, useContext, ReactNode, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { FiCheckCircle, FiAlertCircle, FiInfo, FiX } from "react-icons/fi"
import { cn } from "@/lib/utils"

export type ToastType = "success" | "error" | "info"

export type ToastItem = {
  id: string
  message: string
  type: ToastType
}

type ToastContextType = {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4500)
  }, [])

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3.5 max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map((t, index) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 25, scale: 0.9, rotate: index % 2 === 0 ? -3 : 3 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotate: index % 2 === 0 ? -1 : 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.9, transition: { duration: 0.15 } }}
              transition={{ type: "spring", stiffness: 380, damping: 22 }}
              className="pointer-events-auto relative bg-panel border-2 border-ink rounded-2xl shadow-lift text-ink overflow-visible"
            >
              {/* Washi Tape Accent on top */}
              <div
                className={cn(
                  "absolute -top-2.5 left-1/2 -translate-x-1/2 w-20 h-4 border border-ink/20 shadow-xs pointer-events-none",
                  t.type === "success" && "bg-green/40 -rotate-2",
                  t.type === "error" && "bg-red/40 rotate-2",
                  t.type === "info" && "bg-yellow/60 -rotate-1"
                )}
              />

              <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      "p-2 rounded-xl border border-ink/30 flex items-center justify-center shrink-0 shadow-xs",
                      t.type === "success" && "bg-green/20 text-green",
                      t.type === "error" && "bg-red/20 text-red",
                      t.type === "info" && "bg-yellow/30 text-ink"
                    )}
                  >
                    {t.type === "success" && <FiCheckCircle className="h-5 w-5 stroke-[2.5]" />}
                    {t.type === "error" && <FiAlertCircle className="h-5 w-5 stroke-[2.5]" />}
                    {t.type === "info" && <FiInfo className="h-5 w-5 stroke-[2.5]" />}
                  </div>

                  <div className="flex flex-col min-w-0">
                    <span className="scrawl text-[11px] font-bold uppercase tracking-wider text-muted leading-none mb-1">
                      {t.type === "success" && "Berhasil!"}
                      {t.type === "error" && "Perhatian!"}
                      {t.type === "info" && "Catatan"}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-ink leading-snug">
                      {t.message}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => removeToast(t.id)}
                  className="rounded-lg p-1.5 text-muted hover:text-ink hover:bg-ink/10 transition-colors shrink-0"
                  aria-label="Tutup notifikasi"
                >
                  <FiX className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    return {
      toast: (msg: string) => console.log(msg),
    }
  }
  return ctx
}
