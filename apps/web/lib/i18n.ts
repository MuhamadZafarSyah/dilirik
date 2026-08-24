"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/** i18n ringan ID/EN (PRD §18: UI awal ID + EN). */
export type Lang = "id" | "en";

const dict = {
  id: {
    dashboard: "Dashboard",
    cv: "CV",
    jobs: "Lowongan",
    findJobs: "Cari Lowongan",
    analyze: "Analisis",
    interview: "Latihan Interview",
    coverLetter: "Surat Lamaran",
    applications: "Lamaran",
    settings: "Pengaturan",
    logout: "Keluar",
    quotaLeft: "sisa kuota",
    unlimited: "unlimited",
    loading: "Memuat…",
    emptyCvTitle: "Belum ada CV",
    emptyCvCta: "Tambah CV pertamamu",
    emptyJobTitle: "Belum ada lowongan",
    emptyJobCta: "Tambah lowongan",
    newAnalysis: "Analisis baru",
    runAnalysis: "Jalankan analisis",
    quotaExhausted: "Kuota bulan ini habis",
    seePricing: "Lihat pricing",
    applySuggestion: "Terapkan saran (buat versi baru)",
    saveToTracker: "Simpan ke lamaran",
    compare: "Bandingkan",
    before: "Sebelum",
    after: "Sesudah",
    realGap: "Gap beneran",
    presentationGap: "Gap penyajian",
    // ===== Cari Lowongan =====
    // Subtitle sengaja menyebut cakupan sebenarnya. Tidak pernah "seluruh internet".
    "discovery.title": "Cari Lowongan",
    "discovery.subtitle": "Dari halaman karier resmi perusahaan dan portal lowongan",
    "discovery.cta": "Cari lowongan untuk CV ini",
    "discovery.topPicks": "Wajib Coba",
    "discovery.otherCandidates": "Kandidat lain",
    "discovery.estimatedMatch": "Perkiraan cocok",
    "discovery.estimatedMatchDisclaimer":
      "Perkiraan cocok dihitung dari kata kunci CV dan deskripsi lowongan — bukan skor analisis, dan bukan prediksi kamu akan diterima.",
    "discovery.whyMatch": "Kenapa ini layak dicoba",
    "discovery.caution": "Perlu diperhatikan",
    "discovery.source": "Sumber",
    "discovery.postedAgo": "Diposting",
    "discovery.indexedAgo": "Diindeks",
    "discovery.applyAt": "Lamar di sumber aslinya",
    "discovery.maybeClosed": "Mungkin sudah tutup — cek langsung di sumbernya",
    "discovery.searchProfile": "Profil pencarian",
    "discovery.editProfile": "Ubah profil pencarian",
    "discovery.partialSources": "Sumber yang sedang tidak tersedia",
    "discovery.emptyTitle": "Belum ada lowongan yang cocok",
    "discovery.emptyAlertCta": "Kabari saya kalau ada",
    "discovery.dismiss": "Sembunyikan",
    "discovery.quota": "Sisa pencarian bulan ini",
    "discovery.quotaExceeded": "Kuota pencarian bulan ini habis",
  },
  en: {
    dashboard: "Dashboard",
    cv: "CVs",
    jobs: "Jobs",
    findJobs: "Find Jobs",
    analyze: "Analyze",
    interview: "Mock Interview",
    coverLetter: "Cover Letter",
    applications: "Applications",
    settings: "Settings",
    logout: "Sign out",
    quotaLeft: "quota left",
    unlimited: "unlimited",
    loading: "Loading…",
    emptyCvTitle: "No CV yet",
    emptyCvCta: "Add your first CV",
    emptyJobTitle: "No job postings yet",
    emptyJobCta: "Add a job posting",
    newAnalysis: "New analysis",
    runAnalysis: "Run analysis",
    quotaExhausted: "Monthly quota exhausted",
    seePricing: "See pricing",
    applySuggestion: "Apply suggestions (new version)",
    saveToTracker: "Save to tracker",
    compare: "Compare",
    before: "Before",
    after: "After",
    realGap: "Real gap",
    presentationGap: "Presentation gap",
    // ===== Find Jobs =====
    "discovery.title": "Find Jobs",
    "discovery.subtitle": "From company career pages and job portals",
    "discovery.cta": "Find jobs for this CV",
    "discovery.topPicks": "Must Apply",
    "discovery.otherCandidates": "Other candidates",
    "discovery.estimatedMatch": "Estimated match",
    "discovery.estimatedMatchDisclaimer":
      "The estimated match is computed from CV and job-description keywords — it is not an analysis score, and not a prediction that you will be hired.",
    "discovery.whyMatch": "Why this is worth a shot",
    "discovery.caution": "Worth noting",
    "discovery.source": "Source",
    "discovery.postedAgo": "Posted",
    "discovery.indexedAgo": "Indexed",
    "discovery.applyAt": "Apply at the original source",
    "discovery.maybeClosed": "May already be closed — check the source",
    "discovery.searchProfile": "Search profile",
    "discovery.editProfile": "Edit search profile",
    "discovery.partialSources": "Sources currently unavailable",
    "discovery.emptyTitle": "No matching jobs yet",
    "discovery.emptyAlertCta": "Notify me when there is one",
    "discovery.dismiss": "Hide",
    "discovery.quota": "Searches left this month",
    "discovery.quotaExceeded": "Monthly search quota exhausted",
  },
} as const;

type DictKey = keyof (typeof dict)["id"];

type I18nState = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: DictKey) => string;
};

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
    },
  ),
);
