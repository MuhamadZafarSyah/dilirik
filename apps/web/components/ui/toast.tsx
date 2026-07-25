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
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.9, rotate: -2 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotate: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className={cn(
                "pointer-events-auto flex items-center justify-between gap-3 p-4 rounded-xl border-2 shadow-lift bg-panel border-line text-ink",
                t.type === "success" && "border-green/50 bg-green/10 text-green",
                t.type === "error" && "border-red/50 bg-red/10 text-red",
                t.type === "info" && "border-blue/50 bg-blue/10 text-blue"
              )}
            >
              <div className="flex items-center gap-2 text-sm font-semibold">
                {t.type === "success" && <FiCheckCircle className="h-5 w-5 shrink-0 text-green" />}
                {t.type === "error" && <FiAlertCircle className="h-5 w-5 shrink-0 text-red" />}
                {t.type === "info" && <FiInfo className="h-5 w-5 shrink-0 text-blue" />}
                <span>{t.message}</span>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="rounded-full p-1 hover:bg-ink/10 transition-colors"
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
