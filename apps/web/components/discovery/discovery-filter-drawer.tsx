"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { FiX, FiCheck, FiSliders, FiDollarSign, FiMapPin, FiBriefcase, FiCalendar } from "react-icons/fi"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type SearchFilters = {
  remotePref: "any" | "remote" | "hybrid" | "onsite"
  locations: string[]
  seniority?: "entry" | "mid" | "senior" | "lead" | ""
  salaryMin?: number
  postedWithinDays: number
}

interface DiscoveryFilterDrawerProps {
  isOpen: boolean
  onClose: () => void
  filters: SearchFilters
  onApply: (filters: SearchFilters) => void
  onReset: () => void
}

const REMOTE_OPTIONS = [
  { value: "any", label: "Semua Tipe" },
  { value: "remote", label: "Remote Only" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "On-site (WFO)" },
] as const

const SENIORITY_OPTIONS = [
  { value: "", label: "Semua Level" },
  { value: "entry", label: "Junior / Entry" },
  { value: "mid", label: "Mid-Level" },
  { value: "senior", label: "Senior" },
  { value: "lead", label: "Lead / Principal" },
] as const

const POSTED_DAYS_OPTIONS = [
  { value: 7, label: "7 hari terakhir" },
  { value: 14, label: "14 hari terakhir" },
  { value: 30, label: "30 hari terakhir" },
] as const

const POPULAR_LOCATIONS = ["Jakarta", "Bandung", "Surabaya", "Yogyakarta", "Bali", "Singapore"]

export function DiscoveryFilterDrawer({
  isOpen,
  onClose,
  filters,
  onApply,
  onReset,
}: DiscoveryFilterDrawerProps) {
  const [localFilters, setLocalFilters] = useState<SearchFilters>(filters)
  const [locationInput, setLocationInput] = useState("")

  // Sinkronisasi state lokal saat drawer dibuka
  useEffect(() => {
    if (isOpen) {
      setLocalFilters(filters)
    }
  }, [isOpen, filters])

  const toggleLocation = (loc: string) => {
    const trimmed = loc.trim()
    if (!trimmed) return
    setLocalFilters((prev) => {
      const exists = prev.locations.some((l) => l.toLowerCase() === trimmed.toLowerCase())
      if (exists) {
        return { ...prev, locations: prev.locations.filter((l) => l.toLowerCase() !== trimmed.toLowerCase()) }
      }
      return { ...prev, locations: [...prev.locations, trimmed] }
    })
  }

  const handleAddCustomLocation = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ("key" in e && e.key !== "Enter") return
    if (locationInput.trim()) {
      toggleLocation(locationInput.trim())
      setLocationInput("")
    }
  }

  const handleApply = () => {
    onApply(localFilters)
    onClose()
  }

  const hasActiveOverrides =
    localFilters.remotePref !== "any" ||
    localFilters.locations.length > 0 ||
    Boolean(localFilters.seniority) ||
    Boolean(localFilters.salaryMin && localFilters.salaryMin > 0) ||
    localFilters.postedWithinDays !== 30

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-ink/30 backdrop-blur-xs transition-opacity"
          />

          {/* Drawer Sheet */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="w-screen max-w-md bg-paper border-l-2 border-line flex flex-col shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-line bg-panel">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-paper border border-line shadow-xs">
                    <FiSliders className="w-4 h-4 text-ink" />
                  </div>
                  <div>
                    <h2 className="hand text-2xl font-bold text-ink leading-none">
                      Filter Pencarian
                    </h2>
                    <p className="scrawl text-xs text-muted mt-0.5">
                      Sesuaikan kriteria sebelum mencari lowongan
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl text-muted hover:text-ink hover:bg-paper border border-transparent hover:border-line transition-all cursor-pointer"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              {/* Form Content */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                {/* 1. Tipe Kerja (Remote / Hybrid / On-site) */}
                <div className="space-y-2.5">
                  <label className="flex items-center gap-2 text-xs font-bold text-ink uppercase tracking-wider">
                    <FiBriefcase className="w-3.5 h-3.5 text-muted" />
                    <span>Tipe Kerja</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {REMOTE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setLocalFilters((prev) => ({ ...prev, remotePref: opt.value }))}
                        className={cn(
                          "px-3 py-2.5 rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer flex items-center justify-between",
                          localFilters.remotePref === opt.value
                            ? "bg-ink text-paper border-ink shadow-xs"
                            : "bg-panel text-ink border-line hover:border-ink/50",
                        )}
                      >
                        <span>{opt.label}</span>
                        {localFilters.remotePref === opt.value && <FiCheck className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Lokasi / Kota Target */}
                <div className="space-y-2.5">
                  <label className="flex items-center gap-2 text-xs font-bold text-ink uppercase tracking-wider">
                    <FiMapPin className="w-3.5 h-3.5 text-muted" />
                    <span>Lokasi / Kota Target</span>
                  </label>

                  {/* Quick Chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_LOCATIONS.map((loc) => {
                      const isSelected = localFilters.locations.some((l) => l.toLowerCase() === loc.toLowerCase())
                      return (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => toggleLocation(loc)}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer",
                            isSelected
                              ? "bg-blue text-paper border-blue font-bold shadow-xs"
                              : "bg-panel text-muted border-line hover:text-ink hover:border-ink/40",
                          )}
                        >
                          {isSelected ? `✓ ${loc}` : `+ ${loc}`}
                        </button>
                      )
                    })}
                  </div>

                  {/* Custom Location Input */}
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="text"
                      placeholder="Tambah kota lain (mis. Surabaya, Malang)..."
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
                      onKeyDown={handleAddCustomLocation}
                      className="flex-1 rounded-xl border-2 border-line bg-panel px-3 py-2 text-xs font-medium text-ink placeholder:text-muted focus:border-ink focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomLocation}
                      disabled={!locationInput.trim()}
                      className="px-3 py-2 rounded-xl bg-ink text-paper text-xs font-bold disabled:opacity-40 cursor-pointer"
                    >
                      Tambah
                    </button>
                  </div>

                  {/* Selected Locations Tags */}
                  {localFilters.locations.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {localFilters.locations.map((loc) => (
                        <span
                          key={loc}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-panel border border-line text-xs font-semibold text-ink"
                        >
                          <span>{loc}</span>
                          <button
                            type="button"
                            onClick={() => toggleLocation(loc)}
                            className="hover:text-red transition-colors cursor-pointer"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Level Senioritas */}
                <div className="space-y-2.5">
                  <label className="flex items-center gap-2 text-xs font-bold text-ink uppercase tracking-wider">
                    <FiBriefcase className="w-3.5 h-3.5 text-muted" />
                    <span>Level Pengalaman (Senioritas)</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {SENIORITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setLocalFilters((prev) => ({ ...prev, seniority: opt.value as any }))}
                        className={cn(
                          "px-3 py-2.5 rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer flex items-center justify-between",
                          localFilters.seniority === opt.value
                            ? "bg-ink text-paper border-ink shadow-xs"
                            : "bg-panel text-ink border-line hover:border-ink/50",
                        )}
                      >
                        <span>{opt.label}</span>
                        {localFilters.seniority === opt.value && <FiCheck className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Ekspektasi Gaji Minimal */}
                {/* ZNOTE: sementara hilangkan filter gaji */}
                {/* <div className="space-y-2.5">
                  <label className="flex items-center gap-2 text-xs font-bold text-ink uppercase tracking-wider">
                    <FiDollarSign className="w-3.5 h-3.5 text-muted" />
                    <span>Gaji Minimal (IDR / Bulan)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted">
                      Rp
                    </span>
                    <input
                      type="number"
                      placeholder="mis. 10000000 (kosongkan jika fleksibel)"
                      value={localFilters.salaryMin || ""}
                      onChange={(e) =>
                        setLocalFilters((prev) => ({
                          ...prev,
                          salaryMin: e.target.value ? Number(e.target.value) : undefined,
                        }))
                      }
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border-2 border-line bg-panel text-xs font-bold text-ink placeholder:text-muted focus:border-ink focus:outline-none"
                    />
                  </div>
                </div> */}

                {/* 5. Rentang Waktu Posting */}
                <div className="space-y-2.5">
                  <label className="flex items-center gap-2 text-xs font-bold text-ink uppercase tracking-wider">
                    <FiCalendar className="w-3.5 h-3.5 text-muted" />
                    <span>Waktu Posting Lowongan</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {POSTED_DAYS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setLocalFilters((prev) => ({ ...prev, postedWithinDays: opt.value }))}
                        className={cn(
                          "px-2.5 py-2 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer",
                          localFilters.postedWithinDays === opt.value
                            ? "bg-ink text-paper border-ink shadow-xs"
                            : "bg-panel text-ink border-line hover:border-ink/50",
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Actions Footer */}
              <div className="px-6 py-4 border-t border-line bg-panel flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onReset()
                    setLocalFilters({
                      remotePref: "any",
                      locations: [],
                      seniority: "",
                      salaryMin: undefined,
                      postedWithinDays: 30,
                    })
                  }}
                  disabled={!hasActiveOverrides}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-muted hover:text-red disabled:opacity-40 transition-colors cursor-pointer"
                >
                  Reset Filter
                </button>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={onClose}>
                    Batal
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleApply}>
                    Terapkan Filter
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  )
}
