"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { FiArrowLeft, FiHome, FiSearch } from "react-icons/fi"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export default function NotFound() {
  return (
    <main className="paper-texture min-h-screen flex items-center justify-center p-5 text-ink">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        className="w-full max-w-lg"
      >
        <Card tape="red" pin rotate={-1} className="p-8 text-center space-y-6 shadow-lift">
          <div className="space-y-2">
            <span className="label bg-yellow/40 border border-yellow/70 text-ink px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 shadow-xs">
              <FiSearch className="text-red h-3.5 w-3.5" /> Error 404 · Not Found
            </span>
            <h1 className="hand text-7xl sm:text-8xl font-bold text-ink">404 🙈</h1>
            <h2 className="hand text-3xl sm:text-4xl font-bold text-ink">
              Waduh, Halaman Ini Hilang!
            </h2>
            <p className="scrawl text-muted text-xl max-w-md mx-auto leading-relaxed">
              Halaman yang kamu cari mungkin sudah dipindahkan, dihapus, atau link yang kamu masukkan kurang pas.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/app" className="w-full sm:w-auto">
              <Button variant="danger" size="lg" icon={<FiArrowLeft />} tape="yellow" className="w-full">
                Ke Dashboard App
              </Button>
            </Link>
            <Link href="/" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" icon={<FiHome />} className="w-full">
                Ke Halaman Utama
              </Button>
            </Link>
          </div>

          <p className="label text-muted text-xs pt-4 border-t border-line/60">
            Dilirik · AI Matcher CV & Tracker Pelamaran
          </p>
        </Card>
      </motion.div>
    </main>
  )
}
