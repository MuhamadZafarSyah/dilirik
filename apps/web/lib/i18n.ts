"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

/** i18n ringan ID/EN (PRD §18: UI awal ID + EN). */
export type Lang = "id" | "en"

const dict = {
  id: {
    dashboard: "Dashboard", cv: "CV", jobs: "Lowongan", analyze: "Analisis",
    interview: "Latihan Interview",
    applications: "Lamaran", settings: "Pengaturan", logout: "Keluar",
    quotaLeft: "sisa kuota", unlimited: "unlimited", loading: "Memuat…",
    emptyCvTitle: "Belum ada CV", emptyCvCta: "Tambah CV pertamamu",
    emptyJobTitle: "Belum ada lowongan", emptyJobCta: "Tambah lowongan",
    newAnalysis: "Analisis baru", runAnalysis: "Jalankan analisis",
    quotaExhausted: "Kuota bulan ini habis", seePricing: "Lihat pricing",
    applySuggestion: "Terapkan saran (buat versi baru)", saveToTracker: "Simpan ke lamaran",
    compare: "Bandingkan", before: "Sebelum", after: "Sesudah",
    realGap: "Gap beneran", presentationGap: "Gap penyajian",
  },
  en: {
    dashboard: "Dashboard", cv: "CVs", jobs: "Jobs", analyze: "Analyze",
    interview: "Mock Interview",
    applications: "Applications", settings: "Settings", logout: "Sign out",
    quotaLeft: "quota left", unlimited: "unlimited", loading: "Loading…",
    emptyCvTitle: "No CV yet", emptyCvCta: "Add your first CV",
    emptyJobTitle: "No job postings yet", emptyJobCta: "Add a job posting",
    newAnalysis: "New analysis", runAnalysis: "Run analysis",
    quotaExhausted: "Monthly quota exhausted", seePricing: "See pricing",
    applySuggestion: "Apply suggestions (new version)", saveToTracker: "Save to tracker",
    compare: "Compare", before: "Before", after: "After",
    realGap: "Real gap", presentationGap: "Presentation gap",
  },
} as const

type DictKey = keyof (typeof dict)["id"]

type I18nState = {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: DictKey) => string
}

export const useI18n = create<I18nState>()(
  persist(
    (set, get) => ({
      lang: "id",
      setLang: (lang) => set({ lang }),
      t: (key) => dict[get().lang]?.[key] ?? dict["id"][key],
    }),
    {
      name: "dilirik-lang",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ lang: state.lang }),
    }
  )
)
