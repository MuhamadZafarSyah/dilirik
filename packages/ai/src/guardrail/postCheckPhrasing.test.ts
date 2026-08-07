import { describe, expect, it } from "vitest"
import type { Suggestion } from "@dilirik/shared"
import { postCheckNaturalPhrasing, type PostCheckResult } from "./postCheck"

/** Bullet asli dari CV uji — sudah memakai PaddleOCR, tapi tidak menulis "OCR". */
const BULLET = "hardware and camera document capture via PaddleOCR"

const suggestion = (over: Partial<Suggestion> = {}): Suggestion => ({
  section: "experience",
  before: BULLET,
  after: "hardware and camera OCR document capture via PaddleOCR",
  basedOnFacts: [BULLET],
  targetRequirement: "OCR",
  addressesGap: ["OCR"],
  whatChanged: ["added_tool"],
  rationale: "Menamai teknik yang sudah dipakai supaya terbaca ATS.",
  impact: "high",
  ...over,
})

const reasonOf = (result: PostCheckResult): string => (result.ok ? "" : result.reason)

describe("postCheckNaturalPhrasing (guardrail anti keyword stuffing dalam kurung)", () => {
  it("MENOLAK saran yang seluruh perubahannya cuma menempelkan istilah dalam kurung", () => {
    const result = postCheckNaturalPhrasing(suggestion({ after: `${BULLET} (OCR)` }))
    expect(result.ok).toBe(false)
    expect(reasonOf(result)).toContain("(OCR)")
  })

  it("MENOLAK juga ketika kurungnya diselipkan di tengah kalimat", () => {
    const result = postCheckNaturalPhrasing(
      suggestion({ after: "hardware and camera document capture (OCR) via PaddleOCR" }),
    )
    expect(result.ok).toBe(false)
  })

  it("meloloskan penulisan ulang yang natural", () => {
    expect(postCheckNaturalPhrasing(suggestion()).ok).toBe(true)
  })

  it("meloloskan kurung yang membawa ANGKA — itu metrik, bukan tempelan kata kunci", () => {
    const result = postCheckNaturalPhrasing(
      suggestion({
        before: "Mengelola akun Instagram organisasi kampus",
        after: "Mengelola akun Instagram organisasi kampus (3 posting/minggu)",
      }),
    )
    expect(result.ok).toBe(true)
  })

  it("tidak menghukum kurung yang memang sudah ada di `before`", () => {
    const result = postCheckNaturalPhrasing(
      suggestion({
        before: "Built the frontend of the back-office platform (Nuxt 3)",
        after: "Built the accessible frontend of the back-office platform (Nuxt 3)",
      }),
    )
    expect(result.ok).toBe(true)
  })

  it("meloloskan kurung baru bila kalimatnya juga benar-benar ditulis ulang", () => {
    const result = postCheckNaturalPhrasing(
      suggestion({ after: "OCR-based document capture via PaddleOCR (offline)" }),
    )
    expect(result.ok).toBe(true)
  })
})
