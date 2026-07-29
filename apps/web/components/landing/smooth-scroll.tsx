"use client"

import Lenis from "lenis"
import { useEffect } from "react"

/**
 * Scroll halus Lenis, diisolasi sebagai satu client leaf supaya sisa landing
 * page tetap bisa dirender di server.
 *
 * Dua hal yang dijaga di sini: pengguna dengan `prefers-reduced-motion` tidak
 * mendapat scroll yang dimanipulasi sama sekali, dan loop rAF dihentikan saat
 * komponen dilepas agar tidak ada frame yang terus berjalan setelah navigasi.
 */
export function SmoothScroll() {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches
    if (prefersReducedMotion) return

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    })

    let frame = 0
    const raf = (time: number) => {
      lenis.raf(time)
      frame = requestAnimationFrame(raf)
    }
    frame = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(frame)
      lenis.destroy()
    }
  }, [])

  return null
}
