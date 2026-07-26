"use client"

import { useEffect, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { api } from "@/lib/api"

export function TopProgressBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  // 1. Track Axios API Requests
  useEffect(() => {
    let reqCount = 0
    let timer: NodeJS.Timeout

    const reqInterceptor = api.interceptors.request.use(
      (config) => {
        reqCount++
        setLoading(true)
        setProgress((prev) => (prev < 40 ? 40 : prev < 75 ? 75 : prev))
        return config
      },
      (error) => {
        reqCount = Math.max(0, reqCount - 1)
        if (reqCount === 0) finishProgress()
        return Promise.reject(error)
      }
    )

    const resInterceptor = api.interceptors.response.use(
      (response) => {
        reqCount = Math.max(0, reqCount - 1)
        if (reqCount === 0) finishProgress()
        return response
      },
      (error) => {
        reqCount = Math.max(0, reqCount - 1)
        if (reqCount === 0) finishProgress()
        return Promise.reject(error)
      }
    )

    function finishProgress() {
      setProgress(100)
      timer = setTimeout(() => {
        setLoading(false)
        setProgress(0)
      }, 350)
    }

    return () => {
      api.interceptors.request.eject(reqInterceptor)
      api.interceptors.response.eject(resInterceptor)
      clearTimeout(timer)
    }
  }, [])

  // 2. Navigation Link Click Listener for instant transition feedback
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a")
      if (!target) return
      const href = target.getAttribute("href")
      if (href && href.startsWith("/") && href !== pathname) {
        setLoading(true)
        setProgress(65)
      }
    }

    document.addEventListener("click", handleAnchorClick)
    return () => document.removeEventListener("click", handleAnchorClick)
  }, [pathname])

  // 3. Complete progress when route changes
  useEffect(() => {
    setProgress(100)
    const timer = setTimeout(() => {
      setLoading(false)
      setProgress(0)
    }, 350)
    return () => clearTimeout(timer)
  }, [pathname, searchParams])

  if (!loading && progress === 0) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-1 pointer-events-none bg-line/30">
      <motion.div
        className="h-full bg-red shadow-[0_0_8px_var(--color-red)]"
        initial={{ width: "0%" }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      />
    </div>
  )
}
