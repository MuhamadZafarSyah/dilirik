import { describe, expect, it } from "vitest"
import type { Gap } from "@dilirik/shared"
import { postCheckGapPhrases } from "../guardrail/postCheck"
import { dropImpliedGaps, enforceGapEvidence, promoteHintedGaps, repairTemplateGaps } from "./report"

const QUOTE =
  "hardware and camera document capture via PaddleOCR, canvas-based digital signatures, and AES-256-GCM secured sessions"

/** Satu entri daftar skill — kutipan paling lemah yang tetap lolos ambang karakter. */
const SKILL_ENTRY = "Shadcn/ui"

/** Kalimat pengalaman yang membuktikan hal yang sama, jauh lebih meyakinkan. */
const DESIGN_QUOTE =
  "Translate Figma designs into pixel-perfect, responsive interfaces and maintain 100+ reusable components, integrating REST APIs across multiple client projects."

const RAW_CV = `Muhamad Zafar Syah\nSoftware Engineer\n\nSKILLS\nNext.js, React, ${SKILL_ENTRY}, Tailwind CSS\n\nEXPERIENCE\nDeveloped the frontend of the Persuratan TNI-AD correspondence management system using SvelteKit and Svelte 5, covering 21 pages and 60+ components, with ${QUOTE} with role-based access\n${DESIGN_QUOTE}`

const hint = { skill: "OCR", severity: "must" as const, term: "paddleocr", quote: QUOTE }

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

describe("promoteHintedGaps", () => {
  it("menaikkan gap beneran menjadi gap penyajian saat kode sudah menemukan buktinya", () => {
    const [gap] = promoteHintedGaps([makeGap({ skill: "OCR" })], [hint])
    expect(gap).toBeDefined()
    expect(gap!.type).toBe("presentation")
    expect(gap!.fixability).toBe("fixable_by_editing")
    expect(gap!.evidenceQuote).toBe(QUOTE)
  })

  it("menulis ulang kalimatnya agar tidak lagi menuduh kandidat tidak punya pengalaman", () => {
    const input = makeGap({
      skill: "OCR",
      explanation: "Tidak ada bukti pengalaman atau pengetahuan tentang OCR di CV.",
      advice: "Perlu menambahkan pengalaman atau pengetahuan tentang OCR di CV.",
    })
    const [gap] = promoteHintedGaps([input], [hint])
    expect(gap).toBeDefined()
    expect(gap!.explanation).toContain("PaddleOCR")
    expect(gap!.advice).toContain("paddleocr")
    expect(postCheckGapPhrases(gap!).ok).toBe(true)
  })

  it("tidak menyentuh gap yang tidak punya petunjuk", () => {
    const input = makeGap({ skill: "Automated Testing" })
    expect(promoteHintedGaps([input], [hint])[0]).toEqual(input)
  })

  it("tidak menurunkan gap yang sudah bertipe penyajian", () => {
    const input = makeGap({ skill: "OCR", type: "presentation", evidenceQuote: QUOTE })
    expect(promoteHintedGaps([input], [hint])[0]?.evidenceQuote).toBe(QUOTE)
  })

  it("memakai petunjuk TERKUAT saat satu gap punya beberapa petunjuk", () => {
    const hints = [
      { skill: "Design System", severity: "must" as const, term: "shadcn", quote: SKILL_ENTRY },
      {
        skill: "Design System",
        severity: "must" as const,
        term: "reusable component",
        quote: DESIGN_QUOTE,
      },
    ]
    const [gap] = promoteHintedGaps([makeGap({ skill: "Design System" })], hints, RAW_CV)
    expect(gap).toBeDefined()
    expect(gap!.evidenceQuote).toBe(DESIGN_QUOTE)
    // Istilah pada advice harus ikut petunjuk yang menang, bukan petunjuk lain.
    expect(gap!.advice).toContain("reusable component")
  })

  it("tidak menaikkan gap bila petunjuknya tidak bisa dilacak di teks CV", () => {
    const hints = [
      {
        skill: "Kubernetes",
        severity: "must" as const,
        term: "k8s",
        quote: "mengelola cluster Kubernetes produksi lintas region",
      },
    ]
    const input = makeGap({ skill: "Kubernetes" })
    expect(promoteHintedGaps([input], hints, RAW_CV)[0]).toEqual(input)
  })
})

describe("enforceGapEvidence", () => {
  it("membiarkan kutipan model yang benar-benar ada di CV saat tidak ada petunjuk", () => {
    const input = makeGap({
      skill: "OCR",
      type: "presentation",
      fixability: "fixable_by_editing",
      evidenceQuote: "document capture via PaddleOCR",
    })
    expect(enforceGapEvidence([input], RAW_CV, [])[0]).toEqual(input)
  })

  it("mengganti kutipan karangan dengan bukti deterministik bila tersedia", () => {
    const input = makeGap({
      skill: "OCR",
      type: "presentation",
      fixability: "fixable_by_editing",
      evidenceQuote: "membangun pipeline OCR skala besar di AWS Textract",
    })
    expect(enforceGapEvidence([input], RAW_CV, [hint])[0]?.evidenceQuote).toBe(QUOTE)
  })

  it("menurunkan gap ke 'real' saat kutipannya karangan dan tidak ada bukti apa pun", () => {
    const input = makeGap({
      skill: "Kubernetes",
      type: "presentation",
      fixability: "fixable_by_editing",
      evidenceQuote: "mengelola cluster Kubernetes produksi",
    })
    const [gap] = enforceGapEvidence([input], RAW_CV, [hint])
    expect(gap).toBeDefined()
    expect(gap!.type).toBe("real")
    expect(gap!.fixability).toBe("requires_experience")
    expect(gap!.evidenceQuote).toBe("")
  })

  it("tidak memakai entri daftar skill saat ada kalimat pengalaman yang membuktikan hal sama", () => {
    const input = makeGap({
      skill: "Design System",
      type: "presentation",
      fixability: "fixable_by_editing",
      evidenceQuote: SKILL_ENTRY,
    })
    const hints = [
      {
        skill: "Design System",
        severity: "must" as const,
        term: "reusable component",
        quote: DESIGN_QUOTE,
      },
    ]
    const [gap] = enforceGapEvidence([input], RAW_CV, hints)
    expect(gap).toBeDefined()
    expect(gap!.evidenceQuote).toBe(DESIGN_QUOTE)
  })

  it("kutipan model yang lebih kaya tetap menang atas petunjuk yang lemah", () => {
    const input = makeGap({
      skill: "Design System",
      type: "presentation",
      fixability: "fixable_by_editing",
      evidenceQuote: DESIGN_QUOTE,
    })
    const hints = [
      { skill: "Design System", severity: "must" as const, term: "shadcn", quote: SKILL_ENTRY },
    ]
    expect(enforceGapEvidence([input], RAW_CV, hints)[0]?.evidenceQuote).toBe(DESIGN_QUOTE)
  })
})

describe("repairTemplateGaps", () => {
  it("menimpa kalimat cetakan dengan istilah yang benar-benar dicari", () => {
    const input = makeGap({
      skill: "Automated Testing",
      explanation: "Tidak ada pengalaman atau pengetahuan tentang Automated Testing di CV.",
      advice: "Perlu menambahkan pengalaman atau pengetahuan tentang Automated Testing di CV.",
      searchedFor: ["Jest", "Vitest", "Playwright", "Cypress"],
    })
    const [gap] = repairTemplateGaps([input])
    expect(gap).toBeDefined()
    expect(gap!.explanation).toContain("Jest")
    expect(gap!.explanation).toContain("syarat wajib")
    expect(postCheckGapPhrases(gap!).ok).toBe(true)
  })

  it("tidak menyentuh gap yang kalimatnya sudah spesifik", () => {
    const input = makeGap({
      skill: "Kubernetes",
      explanation:
        "Lowongan meminta pengelolaan cluster Kubernetes, sementara pengalaman deployment di CV berhenti di Vercel dan VPS manual.",
      advice: "Kerjakan satu deployment nyata ke Kubernetes, lalu tulis hasilnya dengan angka.",
    })
    expect(repairTemplateGaps([input])[0]).toEqual(input)
  })

  it("tetap melaporkan gap-nya — yang diganti hanya kalimatnya", () => {
    const input = makeGap({
      skill: "Automated Testing",
      explanation: "Tidak ada bukti pengalaman Automated Testing di CV.",
      advice: "Perlu menambahkan pengalaman Automated Testing.",
    })
    const result = repairTemplateGaps([input])
    expect(result).toHaveLength(1)
    expect(result[0]?.skill).toBe("Automated Testing")
    expect(result[0]?.type).toBe("real")
  })
})

describe("urutan pipeline gap", () => {
  it("gap tersirat dibuang lebih dulu sehingga tidak sempat dinaikkan atau ditulis ulang", () => {
    const gaps = [
      makeGap({ skill: "HTML", explanation: "Tidak ada bukti pengalaman HTML di CV." }),
      makeGap({ skill: "OCR" }),
    ]
    const implied = [{ skill: "HTML", confidence: "certain" as const, evidence: ["SvelteKit"] }]
    const after = promoteHintedGaps(dropImpliedGaps(gaps, implied), [hint])
    expect(after.map((gap) => gap.skill)).toEqual(["OCR"])
    expect(after[0]?.type).toBe("presentation")
  })
})
