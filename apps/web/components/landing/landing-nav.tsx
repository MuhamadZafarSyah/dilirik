"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { FiArrowRight, FiMenu, FiX } from "react-icons/fi"
import { Button } from "@/components/ui/button"

const NAV_LINKS = [
  { label: "demo", href: "#demo" },
  { label: "fitur", href: "#fitur" },
  { label: "cara kerja", href: "#cara-kerja" },
  { label: "harga", href: "#harga" },
  { label: "faq", href: "#faq" },
]

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.25, staggerChildren: 0.07, delayChildren: 0.1 },
  },
  exit: { opacity: 0, transition: { duration: 0.2 } },
}

const overlayItem = {
  hidden: { opacity: 0, y: 26, rotate: -2 },
  visible: {
    opacity: 1,
    y: 0,
    rotate: 0,
    transition: { type: "spring", stiffness: 140, damping: 16 },
  },
}

function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <Link href="/" onClick={onClick} className="flex items-center gap-2" aria-label="Dilirik — beranda">
      <motion.span
        whileHover={{ rotate: 10, scale: 1.08 }}
        className="flex h-9 w-9 -rotate-3 items-center justify-center rounded-xl bg-ink text-lg text-paper shadow-paper"
      >
        👀
      </motion.span>
      <span className="hand text-3xl font-bold leading-none text-ink">
        Dilirik<span className="text-red">.</span>
      </span>
    </Link>
  )
}

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  return (
    <>
      <header className="fixed inset-x-0 top-3 z-50 px-4">
        <div
          className={`mx-auto flex max-w-5xl items-center justify-between gap-3 rounded-full border-2 px-4 py-2 transition-all duration-300 ${
            scrolled
              ? "border-line bg-panel/80 shadow-paper backdrop-blur-md"
              : "border-transparent bg-transparent"
          }`}
        >
          <Logo />

          <nav className="hidden items-center gap-5 md:flex" aria-label="Navigasi utama">
            {NAV_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="scrawl text-xl text-muted transition-all hover:-rotate-2 hover:text-ink"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="scrawl hidden px-2 text-xl text-muted transition-colors hover:text-ink sm:block"
            >
              masuk
            </Link>
            <Link href="/register" className="hidden sm:block">
              <Button variant="danger" size="sm">
                Coba Gratis ⚡
              </Button>
            </Link>
            <button
              onClick={() => setOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/15 bg-panel text-ink shadow-paper md:hidden"
              aria-label="Buka menu"
            >
              <FiMenu className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="paper-texture fixed inset-0 z-[100] flex flex-col bg-paper px-6 py-5 md:hidden"
          >
            <div className="flex items-center justify-between">
              <Logo onClick={() => setOpen(false)} />
              <button
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-ink/15 bg-panel text-ink shadow-paper"
                aria-label="Tutup menu"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            <nav className="mt-14 flex flex-col gap-6" aria-label="Navigasi mobile">
              {NAV_LINKS.map((item) => (
                <motion.a
                  key={item.href}
                  variants={overlayItem}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="hand text-5xl font-bold text-ink"
                >
                  {item.label}
                </motion.a>
              ))}
            </nav>

            <motion.div variants={overlayItem} className="mt-auto flex flex-col gap-3 pb-6">
              <Link href="/register" onClick={() => setOpen(false)} className="block">
                <Button variant="danger" size="lg" icon={<FiArrowRight />} className="w-full">
                  Coba Gratis Sekarang
                </Button>
              </Link>
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="scrawl text-center text-2xl text-muted"
              >
                sudah punya akun? masuk
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
