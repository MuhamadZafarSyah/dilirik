"use client"

import { useState, createContext, useContext, ReactNode, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { FiCheckCircle, FiAlertCircle, FiInfo, FiX } from "react-icons/fi"
import { cn } from "@/lib/utils"

type ToastType = "success" | "error" | "info"

type ToastItem = {
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
    }, 4000)
  }, [])

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2.5 max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.92, rotate: -1 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, y: 10, scale: 0.92 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className={cn(
                "pointer-events-auto flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl border-2 shadow-lift text-ink",
                t.type === "success" && "border-green bg-green/30 text-ink",
                t.type === "error" && "border-red bg-red/30 text-ink",
                t.type === "info" && "border-blue bg-blue/30 text-ink"
              )}
            >
              <div className="flex items-center gap-2.5 text-sm font-bold text-ink">
                {t.type === "success" && <FiCheckCircle className="h-5 w-5 shrink-0 text-green" />}
                {t.type === "error" && <FiAlertCircle className="h-5 w-5 shrink-0 text-red" />}
                {t.type === "info" && <FiInfo className="h-5 w-5 shrink-0 text-blue" />}
                <span className="leading-snug">{t.message}</span>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="rounded-lg p-1 text-muted hover:text-ink hover:bg-ink/10 transition-colors"
                aria-label="Tutup notifikasi"
              >
                <FiX className="h-4 w-4" />
              </button>
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
