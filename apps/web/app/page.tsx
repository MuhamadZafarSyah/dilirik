"use client"

import { useEffect } from "react"
import Lenis from "lenis"
import { LandingDemo } from "@/components/landing/landing-demo"
import { LandingFeatures } from "@/components/landing/landing-features"
import { LandingFooter } from "@/components/landing/landing-footer"
import { LandingHero } from "@/components/landing/landing-hero"
import { LandingHow } from "@/components/landing/landing-how"
import { LandingNav } from "@/components/landing/landing-nav"
import { LandingSocial } from "@/components/landing/landing-social"

export default function LandingPage() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    })

    let rafId = 0
    const loop = (time: number) => {
      lenis.raf(time)
      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
    }
  }, [])

  return (
    <main className="paper-texture min-h-screen overflow-x-hidden font-sans text-ink selection:bg-red selection:text-paper">
      <LandingNav />
      <LandingHero />
      <LandingDemo />
      <LandingFeatures />
      <LandingHow />
      <LandingSocial />
      <LandingFooter />
    </main>
  )
}
