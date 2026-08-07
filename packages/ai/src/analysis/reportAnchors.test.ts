import { describe, expect, it } from "vitest"
import type { Gap, Suggestion } from "@dilirik/shared"
import { postCheckAnchor } from "../guardrail/postCheck"
import { alignSuggestionAnchors, enforceGapEvidence } from "./report"

/**
 * Bullet ini dikutip model sebagai SATU baris utuh — begitulah bentuknya di
 * structuredJson yang ikut dikirim ke prompt.
 */
const HALO_ONE_LINE =
  "Built the frontend of the HaloMasjid back-office platform using Nuxt 3, Vue 3, and TypeScript across 13 modules and 170+ components, including a virtualized real-time group chat, ApexCharts financial dashboards, and a MediaPipe face-recognition survey wizard."

/**
 * Di rawText hasil ekstraksi PDF, bullet yang sama terpecah jadi beberapa baris
 * dan memakai en dash. Inilah sumber Bug 1: model mengutip dari kolom kiri,
 * guardrail memverifikasi ke kolom kanan.
 */
const RAW_CV = [
  "EXPERIENCE",
  "Frontend Developer \u2013 PT Contoh",
  "Built the frontend of the HaloMasjid back-office platform using Nuxt 3, Vue 3, and",
  "TypeScript across 13 modules and 170+ components, including a virtualized real-time",
  "group chat, ApexCharts financial dashboards, and a MediaPipe face-recognition survey",
  "wizard.",
].join("\n")

function makeSuggestion(before: string): Suggestion {
  return {
    section: "experience",
    before,
    after: `${before} (Computer Vision)`,
    basedOnFacts: ["MediaPipe"],
    targetRequirement: "Computer Vision",
    addressesGap: ["Computer Vision"],
    whatChanged: ["added_scope"],
    rationale: "Menamai teknik yang sudah dikerjakan.",
    impact: "high",
  } as Suggestion
}

function makeGap(evidenceQuote: string): Gap {
  return {
    type: "presentation",
    skill: "Computer Vision",
    explanation: "",
    advice: "",
    severity: "must",
    fixability: "fixable_by_editing",
    evidenceQuote,
    searchedFor: ["Computer Vision", "MediaPipe"],
  } as Gap
}

describe("alignSuggestionAnchors", () => {
  it("menyelamatkan jangkar yang di CV terpecah jadi beberapa baris", () => {
    const original = makeSuggestion(HALO_ONE_LINE)
    expect(RAW_CV.includes(original.before)).toBe(false)

    const [aligned] = alignSuggestionAnchors([original], RAW_CV)
    expect(aligned).toBeDefined()
    expect(postCheckAnchor(aligned!, RAW_CV).ok).toBe(true)
    expect(RAW_CV).toContain(aligned!.before)
  })

  it("membiarkan jangkar yang sudah persis", () => {
    const original = makeSuggestion("ApexCharts financial dashboards")
    expect(alignSuggestionAnchors([original], RAW_CV)[0]).toEqual(original)
  })

  it("tidak menyentuh jangkar parafrase — penolakan tetap tugas postCheckAnchor", () => {
    const original = makeSuggestion("Developed the HaloMasjid dashboard")
    const [aligned] = alignSuggestionAnchors([original], RAW_CV)
    expect(aligned).toBeDefined()
    expect(aligned!.before).toBe(original.before)
    expect(postCheckAnchor(aligned!, RAW_CV).ok).toBe(false)
  })

  it("meluruskan dash non-ASCII", () => {
    const [aligned] = alignSuggestionAnchors(
      [makeSuggestion("Frontend Developer - PT Contoh")],
      RAW_CV,
    )
    expect(aligned).toBeDefined()
    expect(aligned!.before).toBe("Frontend Developer \u2013 PT Contoh")
  })

  it("tidak memutasi saran aslinya", () => {
    const input = [makeSuggestion(HALO_ONE_LINE)]
    alignSuggestionAnchors(input, RAW_CV)
    expect(input[0]).toBeDefined()
    expect(input[0]!.before).toBe(HALO_ONE_LINE)
  })
})

describe("konsistensi antar guardrail (regresi Bug 1)", () => {
  it("gap dan saran tidak boleh berbeda pendapat soal kalimat yang sama", () => {
    const [gap] = enforceGapEvidence([makeGap(HALO_ONE_LINE)], RAW_CV, [])
    const [aligned] = alignSuggestionAnchors([makeSuggestion(HALO_ONE_LINE)], RAW_CV)

    expect(gap).toBeDefined()
    expect(aligned).toBeDefined()
    expect(gap!.type).toBe("presentation")
    expect(postCheckAnchor(aligned!, RAW_CV).ok).toBe(true)
    expect(gap!.evidenceQuote).toBe(aligned!.before)
  })

  it("kutipan bukti selalu bisa disorot di CV asli", () => {
    const [gap] = enforceGapEvidence([makeGap(HALO_ONE_LINE)], RAW_CV, [])
    expect(gap).toBeDefined()
    expect(RAW_CV).toContain(gap!.evidenceQuote)
  })

  it("kutipan dari hints ikut diluruskan ke teks PDF, bukan dipakai mentah", () => {
    const hints = [
      {
        skill: "Computer Vision",
        term: "mediapipe",
        quote: HALO_ONE_LINE,
        severity: "must" as const,
      },
    ]
    const [gap] = enforceGapEvidence(
      [makeGap("membangun model deteksi objek dengan YOLOv8")],
      RAW_CV,
      hints,
    )
    expect(gap).toBeDefined()
    expect(gap!.type).toBe("presentation")
    expect(gap!.evidenceQuote).not.toBe(HALO_ONE_LINE)
    expect(RAW_CV).toContain(gap!.evidenceQuote)
  })
})
