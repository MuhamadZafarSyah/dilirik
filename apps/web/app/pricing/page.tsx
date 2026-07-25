"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { FiCheckCircle, FiZap, FiArrowRight } from "react-icons/fi"
import { Button } from "@/components/ui/button"
import { Card, Polaroid } from "@/components/ui/card"

export default function PricingPage() {
  return (
    <main className="paper-texture min-h-screen">
      {/* Header */}
      <header className="shell mx-auto flex max-w-shell items-center justify-between px-5 py-6">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="bg-ink text-paper flex h-9 w-9 items-center justify-center rounded-xl shadow-paper text-lg font-bold">
            👀
          </div>
          <span className="hand text-3xl font-bold text-ink">Dilirik</span>
        </Link>
        <Link href="/register">
          <Button variant="primary" size="sm" tape="yellow">
            Daftar Gratis
          </Button>
        </Link>
      </header>

      {/* Pricing Hero */}
      <section className="shell mx-auto max-w-shell px-5 py-12 text-center">
        <div className="max-w-2xl mx-auto space-y-3">
          <span className="label bg-yellow/40 border border-yellow/60 text-ink px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            Pricing Sederhana & Transparan
          </span>
          <h1 className="hand text-5xl sm:text-6xl font-bold text-ink">Pilih Paket Kamu 📌</h1>
          <p className="scrawl text-muted text-xl">
            Selama masa beta: <strong className="text-ink font-bold">Semua fitur gratis.</strong> Tanpa kartu kredit.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="mx-auto mt-12 grid max-w-3xl gap-8 md:grid-cols-2">
          {/* Free Beta Plan */}
          <Card tape="red" pin rotate={-1} className="flex flex-col justify-between p-8 text-left space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="label bg-ink text-paper px-3 py-1 rounded-full text-xs font-bold uppercase">
                  Free (Beta)
                </span>
                <span className="scrawl text-muted text-xs font-bold">Recommended</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="hand text-6xl font-bold text-red">Rp0</span>
                <span className="scrawl text-muted text-lg">/ bulan</span>
              </div>
              <p className="text-muted text-xs leading-relaxed">
                Cocok untuk kamu yang sedang aktif mencari pekerjaan dan ingin optimasi CV secara berkala.
              </p>

              <ul className="space-y-3 text-sm text-ink pt-2 font-medium">
                <li className="flex items-center gap-2">
                  <FiCheckCircle className="text-green h-4 w-4 shrink-0" />
                  <span>10 Analisis Match / bulan</span>
                </li>
                <li className="flex items-center gap-2">
                  <FiCheckCircle className="text-green h-4 w-4 shrink-0" />
                  <span>Simpan Master CV & Lowongan tanpa batas</span>
                </li>
                <li className="flex items-center gap-2">
                  <FiCheckCircle className="text-green h-4 w-4 shrink-0" />
                  <span>Editor Revisi Teks CV 1-Click</span>
                </li>
                <li className="flex items-center gap-2">
                  <FiCheckCircle className="text-green h-4 w-4 shrink-0" />
                  <span>Simpan Versi & Compare Sebelum/Sesudah</span>
                </li>
                <li className="flex items-center gap-2">
                  <FiCheckCircle className="text-green h-4 w-4 shrink-0" />
                  <span>Tracker Pipeline Pelamaran</span>
                </li>
              </ul>
            </div>

            <Link href="/register" className="block pt-4">
              <Button variant="danger" size="lg" className="w-full">
                Mulai Sekarang Gratis
              </Button>
            </Link>
          </Card>

          {/* Pro Plan Coming Soon */}
          <Card tape="blue" rotate={1} className="flex flex-col justify-between p-8 text-left space-y-6 opacity-90 border-dashed">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="label bg-blue/20 text-blue px-3 py-1 rounded-full text-xs font-bold uppercase">
                  Pro
                </span>
                <span className="scrawl text-blue text-xs font-bold">Segera Hadir</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="hand text-5xl font-bold text-blue">Unlimited</span>
              </div>
              <p className="text-muted text-xs leading-relaxed">
                Untuk pencari kerja profesional yang butuh analisis tanpa batas dan fitur ekspor advanced.
              </p>

              <ul className="space-y-3 text-sm text-muted pt-2 font-medium">
                <li className="flex items-center gap-2">
                  <FiCheckCircle className="text-blue h-4 w-4 shrink-0" />
                  <span>Analisis Match Unlimited</span>
                </li>
                <li className="flex items-center gap-2">
                  <FiCheckCircle className="text-blue h-4 w-4 shrink-0" />
                  <span>Prioritas Pengolahan Model AI</span>
                </li>
                <li className="flex items-center gap-2">
                  <FiCheckCircle className="text-blue h-4 w-4 shrink-0" />
                  <span>Ekspor Laporan Analisis Lengkap</span>
                </li>
              </ul>
            </div>

            <div className="pt-4">
              <p className="scrawl text-muted text-sm text-center">
                Pengguna Beta akan mendapatkan harga penawaran spesial 💛
              </p>
            </div>
          </Card>
        </div>
      </section>
    </main>
  )
}
