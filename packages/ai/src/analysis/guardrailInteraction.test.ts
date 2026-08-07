import { beforeEach, describe, expect, it, vi } from "vitest"
import type { CvStructured, Gap, JobParsed } from "@dilirik/shared"

/**
 * Tes INTERAKSI antar-guardrail.
 *
 * Berkas ini ada karena satu kelas kesalahan yang tidak pernah tertangkap:
 * setiap guardrail punya tesnya sendiri, semuanya hijau, dan mesinnya tetap
 * salah di produksi karena dua guardrail saling meniadakan. v3.3.0 melarang
 * model menempelkan istilah dalam kurung; model mematuhinya dengan menulis
 * "OCR-based"; lalu pemeriksa pengantaran v3.2.3 membuang saran itu karena
 * "ocr-based" bukan token "ocr". Laporan yang sampai ke pengguna: lima gap
 * yang bisa diperbaiki dengan menyunting kalimat, NOL saran revisi.
 *
 * Karena itu semua tes di sini menjalankan pipeline ASLI. Yang dipalsukan
 * hanya panggilan LLM-nya — sebab yang ingin dijamin bukan "fungsi ini
 * mengembalikan true", melainkan "saran yang benar tidak akan hilang di jalan".
 */
const { mockGenerateStructured } = vi.hoisted(() => ({ mockGenerateStructured: vi.fn() }))

vi.mock("../generateStructured", () => ({ generateStructured: mockGenerateStructured }))

import { postCheckGapPhrases } from "../guardrail/postCheck"
import { enforceGapEvidence, generateAnalysisReport } from "./report"

const OCR_BULLET =
  "Developed the Persuratan TNI-AD system with hardware and camera document capture via PaddleOCR and AES-256-GCM secured sessions"

const RAW_CV = `Muhamad Zafar Syah\nSoftware Engineer\n\nEXPERIENCE\nFrontend Developer, PT Contoh (2024)\n${OCR_BULLET}`

const cv: CvStructured = {
  fullName: "Muhamad Zafar Syah",
  headline: "Software Engineer",
  about: null,
  skills: ["SvelteKit", "TypeScript"],
  experiences: [
    {
      title: "Frontend Developer",
      company: "PT Contoh",
      period: "2024",
      highlights: [OCR_BULLET],
    },
  ],
  achievements: [],
  education: [],
  sections: [],
}

const job: JobParsed = {
  jobTitle: "Frontend Developer",
  company: "PT Nusantara Data Kreasi",
  level: "Mid",
  mustHaveSkills: ["OCR", "Enkripsi Data"],
  niceToHaveSkills: [],
  requirements: [
    "Mengintegrasikan alur OCR di sisi frontend",
    "Menerapkan enkripsi data pada sesi pengguna",
  ],
  keywords: ["OCR", "enkripsi"],
}

const gaps: Gap[] = [
  {
    type: "presentation",
    skill: "OCR",
    explanation: "Alur tangkap dokumen sudah memakai PaddleOCR.",
    advice: "Sebut OCR secara eksplisit di baris itu.",
    severity: "must",
    fixability: "fixable_by_editing",
    evidenceQuote: OCR_BULLET,
    searchedFor: ["OCR", "PaddleOCR"],
  },
  {
    type: "presentation",
    skill: "Enkripsi Data",
    explanation: "Sesi pengguna sudah diamankan dengan AES-256-GCM.",
    advice: "Sebut enkripsi data secara eksplisit di baris itu.",
    severity: "must",
    fixability: "fixable_by_editing",
    evidenceQuote: OCR_BULLET,
    searchedFor: ["enkripsi", "AES-256-GCM"],
  },
]

function makeGap(partial: Partial<Gap> & { skill: string }): Gap {
  return {
    type: "real",
    explanation: "",
    advice: "",
    severity: "must",
    fixability: "requires_experience",
    evidenceQuote: "",
    searchedFor: [],
    ...partial,
  } as Gap
}

function runReport(args: { addressesGap: string[]; after: string; careerNote?: string }) {
  mockGenerateStructured.mockResolvedValue({
    gaps,
    careerNote: args.careerNote ?? "",
    suggestions: [
      {
        section: "experience",
        before: OCR_BULLET,
        after: args.after,
        basedOnFacts: [OCR_BULLET],
        targetRequirement: "Mengintegrasikan alur OCR di sisi frontend",
        addressesGap: args.addressesGap,
        whatChanged: ["added_scope"],
        rationale: "Menamai teknik yang sudah dikerjakan agar terbaca ATS.",
        impact: "high",
      },
    ],
  })

  return generateAnalysisReport({
    cv,
    job,
    rawText: RAW_CV,
    language: "id",
    mode: "optimize",
    rule: {
      matchedMust: [],
      missingMust: ["OCR", "Enkripsi Data"],
      missingNice: [],
    },
  })
}

/**
 * Bentuk yang DIPILIH model justru karena guardrail kealamian melarang "(OCR)".
 * Inilah kalimat yang dibuang mesin v3.3.2.
 */
const NATURAL_COMPOUND =
  "Developed the Persuratan TNI-AD system with OCR-based hardware and camera document capture via PaddleOCR and AES-256-GCM encryption for secure sessions"

/** Tidak menambah istilah gap apa pun — "ocr" cuma tersembunyi di "paddleocr". */
const NO_NEW_TERM = `${OCR_BULLET} and improved throughput`

describe("guardrail kealamian vs guardrail pengantaran", () => {
  beforeEach(() => {
    mockGenerateStructured.mockReset()
  })

  it("meloloskan istilah gap yang ditulis sebagai kata majemuk berhubung", async () => {
    const outcome = await runReport({ addressesGap: ["OCR"], after: NATURAL_COMPOUND })

    expect(outcome.rejected).toHaveLength(0)
    expect(outcome.suggestions).toHaveLength(1)
    expect(outcome.suggestions[0]?.after).toContain("OCR-based")
  })

  it("membaca kata majemuk untuk KEDUA gap yang diklaim sekaligus", async () => {
    const outcome = await runReport({
      addressesGap: ["OCR", "Enkripsi Data"],
      after: NATURAL_COMPOUND,
    })

    expect(outcome.rejected).toHaveLength(0)
    expect(outcome.suggestions).toHaveLength(1)
  })

  it("tetap menolak saran yang tidak menambah istilah gap apa pun", async () => {
    const outcome = await runReport({ addressesGap: ["OCR"], after: NO_NEW_TERM })

    expect(outcome.suggestions).toHaveLength(0)
    expect(outcome.rejected[0]?.reason).toContain("OCR")
  })

  it("tidak menganggap istilah terantar hanya karena tersubstring di kata lain", async () => {
    // "paddleocr" sudah ada di `before`; memindahkannya bukan penambahan.
    const outcome = await runReport({
      addressesGap: ["OCR"],
      after: `Built with PaddleOCR document capture and ${OCR_BULLET}`,
    })

    expect(outcome.suggestions).toHaveLength(0)
  })
})

describe("penurunan gap ikut menulis ulang kalimatnya", () => {
  it("tidak menyisakan saran 'cukup sebutkan' pada gap yang butuh pengalaman baru", () => {
    const input = makeGap({
      skill: "Computer Vision",
      type: "presentation",
      fixability: "fixable_by_editing",
      evidenceQuote: "built a MediaPipe face-recognition survey wizard",
      explanation: "The candidate has experience with MediaPipe, which is a computer vision library.",
      advice: "Explicitly mention 'Computer Vision' in the CV.",
      searchedFor: ["Computer Vision", "MediaPipe"],
    })

    const [gap] = enforceGapEvidence([input], RAW_CV, [])

    expect(gap).toBeDefined()
    expect(gap!.type).toBe("real")
    expect(gap!.fixability).toBe("requires_experience")
    expect(gap!.evidenceQuote).toBe("")
    // Kalimat model yang menyuruh "cukup sebutkan" harus ikut hilang.
    expect(gap!.advice).not.toContain("Explicitly mention")
    expect(gap!.advice).toContain("kerjakan satu bagian nyata")
    expect(gap!.explanation).toContain("MediaPipe")
    expect(gap!.explanation).toContain("syarat wajib")
    expect(postCheckGapPhrases(gap!).ok).toBe(true)
  })

  it("membiarkan gap yang kutipannya benar-benar ada di CV", () => {
    const input = makeGap({
      skill: "OCR",
      type: "presentation",
      fixability: "fixable_by_editing",
      evidenceQuote: "document capture via PaddleOCR",
      advice: "Sebut OCR secara eksplisit di baris itu.",
    })

    expect(enforceGapEvidence([input], RAW_CV, [])[0]?.advice).toBe(
      "Sebut OCR secara eksplisit di baris itu.",
    )
  })
})

describe("careerNote setelah penyaringan kalimat", () => {
  beforeEach(() => {
    mockGenerateStructured.mockReset()
  })

  it("tidak menyisakan kata sambung menggantung saat kalimat pertama dibuang", async () => {
    const outcome = await runReport({
      addressesGap: ["OCR"],
      after: NATURAL_COMPOUND,
      careerNote:
        "The candidate has a strong background in frontend engineering. However, the CV could be improved by naming OCR explicitly.",
    })

    expect(outcome.careerNoteDropped).toHaveLength(1)
    expect(outcome.careerNote).not.toContain("However")
    expect(outcome.careerNote).toBe(
      "The CV could be improved by naming OCR explicitly.",
    )
  })

  it("tidak menyentuh careerNote yang seluruh kalimatnya lolos", async () => {
    const note = "Profil ini paling kuat di sisi frontend produk internal."
    const outcome = await runReport({
      addressesGap: ["OCR"],
      after: NATURAL_COMPOUND,
      careerNote: note,
    })

    expect(outcome.careerNoteDropped).toHaveLength(0)
    expect(outcome.careerNote).toBe(note)
  })
})
