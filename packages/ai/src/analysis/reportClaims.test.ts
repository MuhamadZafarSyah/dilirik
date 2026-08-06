import { beforeEach, describe, expect, it, vi } from "vitest"
import { suggestionSchema, type CvStructured, type Gap, type JobParsed } from "@dilirik/shared"

/**
 * Guardrail pengantaran diuji lewat pipeline ASLI, bukan dengan mengekspor
 * fungsi privatnya. Yang ingin dijamin bukan "fungsi ini mengembalikan false",
 * melainkan "saran seperti ini tidak akan pernah sampai ke pengguna" — dan itu
 * hanya terbukti kalau seluruh rantai guardrail benar-benar dijalankan.
 * Satu-satunya yang dipalsukan adalah panggilan LLM-nya.
 */
const { mockGenerateStructured } = vi.hoisted(() => ({ mockGenerateStructured: vi.fn() }))

vi.mock("../generateStructured", () => ({ generateStructured: mockGenerateStructured }))

import { generateAnalysisReport } from "./report"

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

/** Dua gap yang faktanya sama-sama ada di bullet yang sama. */
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

function runReport(addressesGap: string[], after: string) {
  mockGenerateStructured.mockResolvedValue({
    gaps,
    careerNote: "",
    suggestions: [
      {
        section: "experience",
        before: OCR_BULLET,
        after,
        basedOnFacts: [OCR_BULLET],
        targetRequirement: "Mengintegrasikan alur OCR di sisi frontend",
        addressesGap,
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

/** Hanya gap OCR yang benar-benar diantar; "Enkripsi Data" tidak disebut. */
const DELIVERS_OCR_ONLY = `${OCR_BULLET}, applying OCR to speed up document intake`

/** Kedua gap benar-benar muncul di hasil akhirnya. */
const DELIVERS_BOTH = `${OCR_BULLET}, applying OCR and enkripsi data end-to-end on user sessions`

describe("verifikasi tiap klaim addressesGap", () => {
  beforeEach(() => {
    mockGenerateStructured.mockReset()
  })

  it("membuang saran bila SATU dari beberapa gap yang diklaim tidak terantar", async () => {
    const outcome = await runReport(["OCR", "Enkripsi Data"], DELIVERS_OCR_ONLY)

    expect(outcome.suggestions).toHaveLength(0)
    expect(outcome.rejected).toHaveLength(1)
    // Alasannya harus menunjuk klaim yang GAGAL, bukan klaim yang kebetulan lolos.
    expect(outcome.rejected[0]?.reason).toContain("Enkripsi Data")
  })

  it("meloloskan saran yang mengantar semua gap yang diklaimnya", async () => {
    const outcome = await runReport(["OCR", "Enkripsi Data"], DELIVERS_BOTH)

    expect(outcome.rejected).toHaveLength(0)
    expect(outcome.suggestions).toHaveLength(1)
    expect(outcome.suggestions[0]?.addressesGap).toEqual(["OCR", "Enkripsi Data"])
  })

  it("meloloskan saran yang jujur hanya mengklaim satu gap", async () => {
    const outcome = await runReport(["OCR"], DELIVERS_OCR_ONLY)

    expect(outcome.rejected).toHaveLength(0)
    expect(outcome.suggestions).toHaveLength(1)
  })

  it("menolak klaim ke gap yang tidak ada di hasil diagnosis", async () => {
    const outcome = await runReport(["Kubernetes"], DELIVERS_OCR_ONLY)

    expect(outcome.suggestions).toHaveLength(0)
    expect(outcome.rejected[0]?.reason).toContain("Kubernetes")
  })
})

describe("bentuk addressesGap", () => {
  it("memecah bentuk string lama menjadi array agar analisis tersimpan tetap terbaca", () => {
    const parsed = suggestionSchema.parse({
      section: "experience",
      before: "a",
      after: "b",
      basedOnFacts: ["a"],
      addressesGap: "OCR, Enkripsi Data",
    })

    expect(parsed.addressesGap).toEqual(["OCR", "Enkripsi Data"])
  })

  it("mengabaikan koma menggantung dan spasi berlebih", () => {
    const parsed = suggestionSchema.parse({
      section: "experience",
      before: "a",
      after: "b",
      basedOnFacts: ["a"],
      addressesGap: "  OCR ,, ",
    })

    expect(parsed.addressesGap).toEqual(["OCR"])
  })

  it("memakai array kosong saat field-nya tidak dikirim sama sekali", () => {
    const parsed = suggestionSchema.parse({
      section: "experience",
      before: "a",
      after: "b",
      basedOnFacts: ["a"],
    })

    expect(parsed.addressesGap).toEqual([])
  })
})
