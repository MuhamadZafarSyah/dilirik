import { describe, expect, it } from "vitest"
import type { CvStructured, JobParsed } from "@dilirik/shared"
import { findConceptEvidence } from "./conceptEvidence"
import { ruleBasedScore } from "./ruleBased"

/** Bullet asli dari CV uji — sengaja verbatim, ini sumber semua kasus di bawah. */
const TNI_BULLET =
  "Developed the frontend of the Persuratan TNI-AD correspondence management system using SvelteKit and Svelte 5, covering 21 pages and 60+ components, with hardware and camera document capture via PaddleOCR, canvas-based digital signatures, and AES-256-GCM secured sessions with role-based access"

const terms = (skill: string, corpus: string[]): string[] =>
  findConceptEvidence(skill, corpus).map((evidence) => evidence.term.toLowerCase())

describe("findConceptEvidence — konsep lowongan vs implementasi di CV", () => {
  it("mengenali PaddleOCR sebagai bukti OCR", () => {
    expect(terms("OCR", [TNI_BULLET])).toContain("paddleocr")
  })

  it("mengenali AES-256-GCM sebagai bukti enkripsi data", () => {
    const found = terms("Enkripsi Data", [TNI_BULLET])
    expect(found.some((term) => term.includes("aes"))).toBe(true)
  })

  it("mengenali ApexCharts sebagai bukti data visualization", () => {
    const corpus = ["Built an analytics dashboard with ApexCharts for 12 business metrics"]
    expect(terms("Data Visualization", corpus)).toContain("apexcharts")
  })

  it("mengenali MediaPipe sebagai bukti computer vision", () => {
    const corpus = ["Implemented face landmark detection using MediaPipe on the browser"]
    expect(terms("Computer Vision", corpus)).toContain("mediapipe")
  })

  it("mengenali komponen reusable sebagai bukti design system", () => {
    const corpus = ["Built 100+ reusable components consumed by 4 internal products"]
    expect(terms("Design System", corpus).length).toBeGreaterThan(0)
  })

  it("mengembalikan kutipan yang memuat istilahnya, bukan kalimat lain", () => {
    const [evidence] = findConceptEvidence("OCR", ["Menulis dokumentasi API internal", TNI_BULLET])
    expect(evidence.quote).toContain("PaddleOCR")
  })

  // Kontrol negatif — bagian terpenting dari berkas ini.
  // Tanpa pagar ini, perbaikan gap palsu berubah jadi mesin positif palsu.
  it("TIDAK mengarang bukti automated testing dari CV yang tidak punya test runner", () => {
    const corpus = [
      TNI_BULLET,
      "Next.js, React, TypeScript, Tailwind CSS",
      "Membangun REST API dengan Express.js",
    ]
    expect(findConceptEvidence("Automated Testing", corpus)).toEqual([])
  })

  it("TIDAK menganggap kata generik seperti 'data' sebagai bukti data visualization", () => {
    const corpus = ["Mengelola data pelanggan dan merapikan struktur data internal"]
    expect(findConceptEvidence("Data Visualization", corpus)).toEqual([])
  })

  it("mengembalikan array kosong untuk konsep yang tidak ada di peta", () => {
    expect(findConceptEvidence("Manajemen Vendor", [TNI_BULLET])).toEqual([])
  })

  it("membatasi jumlah bukti per requirement agar prompt tidak membengkak", () => {
    const corpus = [
      "Integrasi PaddleOCR untuk tangkap dokumen",
      "Migrasi ke Tesseract untuk dokumen lama",
      "Uji coba EasyOCR pada struk belanja",
    ]
    expect(findConceptEvidence("OCR", corpus).length).toBeLessThanOrEqual(2)
  })
})

const cv: CvStructured = {
  fullName: "Kandidat Uji",
  headline: "Software Engineer",
  about: "",
  skills: ["Next.js", "React", "TypeScript", "Tailwind CSS"],
  achievements: [],
  experiences: [{ title: "Frontend Developer", company: "PT Uji", highlights: [TNI_BULLET] }],
  education: [{ institution: "Universitas Uji", degree: "S1 Informatika" }],
}

const job: JobParsed = {
  jobTitle: "Frontend Developer",
  mustHaveSkills: ["React", "OCR", "Automated Testing"],
  niceToHaveSkills: [],
  requirements: [],
  keywords: [],
}

describe("ruleBasedScore — presentationHints", () => {
  const result = ruleBasedScore(cv, job)

  it("menandai OCR sebagai kemungkinan soal penyajian", () => {
    expect(result.presentationHints.map((hint) => hint.skill)).toEqual(["OCR"])
    expect(result.presentationHints[0].quote).toContain("PaddleOCR")
    expect(result.presentationHints[0].severity).toBe("must")
  })

  it("tidak menandai automated testing — itu memang gap beneran", () => {
    expect(result.presentationHints.some((hint) => hint.skill === "Automated Testing")).toBe(false)
    expect(result.missingMust).toContain("Automated Testing")
  })

  // Keputusan desain yang sengaja: petunjuk penyajian TIDAK menaikkan skor.
  // Kepastiannya di bawah graf implikasi, dan menaikkan angka di layar user
  // berdasarkan dugaan akan merusak arti angka itu.
  it("tidak mengubah klasifikasi maupun skor", () => {
    expect(result.missingMust).toContain("OCR")
    expect(result.matchedMust).toEqual(["React"])
    expect(result.score).toBe(33)
  })
})
