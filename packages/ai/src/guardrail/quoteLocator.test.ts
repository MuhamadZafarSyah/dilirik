import { describe, expect, it } from "vitest"
import { alignQuote, locateQuote } from "./quoteLocator"

const CV = [
  "EXPERIENCE",
  "Frontend Developer - PT Contoh",
  "Built the frontend of the HaloMasjid back-office platform using Nuxt 3,",
  "Vue 3, and TypeScript across 13 modules and 170+ components.",
].join("\n")

describe("locateQuote", () => {
  it("mengembalikan potongan rawText apa adanya, bukan hasil normalisasi", () => {
    const match = locateQuote("Frontend Developer - PT Contoh", CV)
    expect(match?.canonical).toBe("Frontend Developer - PT Contoh")
  })

  it("menyeberangi pergantian baris dan mengembalikan teks asli berikut newline-nya", () => {
    const quote =
      "Built the frontend of the HaloMasjid back-office platform using Nuxt 3, Vue 3, and TypeScript"
    const match = locateQuote(quote, CV)
    expect(match).not.toBeNull()
    expect(match?.canonical).toContain("\n")
    expect(CV.slice(match?.start, match?.end)).toBe(match?.canonical)
  })

  it("toleran terhadap dash non-ASCII", () => {
    expect(alignQuote("Frontend Developer \u2013 PT Contoh", CV)).toBe(
      "Frontend Developer - PT Contoh",
    )
  })

  it("toleran terhadap kutip melengkung", () => {
    const raw = "Led the team\u2019s migration"
    expect(alignQuote("Led the team's migration", raw)).toBe(raw)
  })

  it("toleran terhadap non-breaking space dan spasi ganda", () => {
    const raw = "Vue\u00a03,  and   TypeScript"
    expect(alignQuote("Vue 3, and TypeScript", raw)).toBe(raw)
  })

  it("toleran terhadap karakter tak terlihat", () => {
    const raw = "Paddle\u200bOCR pipeline"
    expect(alignQuote("PaddleOCR pipeline", raw)).toBe(raw)
  })

  it("toleran terhadap soft hyphen", () => {
    const raw = "back\u00ad-office platform"
    expect(alignQuote("back-office platform", raw)).toBe(raw)
  })

  it("menyatukan kata yang terpenggal di ujung baris", () => {
    const raw = "a Media-\nPipe face-recognition wizard"
    expect(alignQuote("MediaPipe face-recognition wizard", raw)).toBe(
      "Media-\nPipe face-recognition wizard",
    )
  })

  it("tidak menyatukan tanda hubung biasa di tengah baris", () => {
    expect(alignQuote("backoffice platform", CV)).toBeNull()
    expect(alignQuote("back-office platform", CV)).toBe("back-office platform")
  })

  it("toleran terhadap ligatur hasil ekstraksi PDF", () => {
    const raw = "Optimized the \ufb01rst load"
    expect(alignQuote("Optimized the first load", raw)).toBe(raw)
  })

  it("mengabaikan perbedaan kapitalisasi", () => {
    expect(alignQuote("FRONTEND DEVELOPER", CV)).toBe("Frontend Developer")
  })

  it("menolak parafrase", () => {
    expect(alignQuote("Developed the HaloMasjid platform", CV)).toBeNull()
  })

  it("menolak kutipan kosong", () => {
    expect(locateQuote("", CV)).toBeNull()
    expect(locateQuote("   \n  ", CV)).toBeNull()
  })

  it("start dan end selalu konsisten dengan canonical", () => {
    const match = locateQuote("170+ components", CV)
    expect(match).not.toBeNull()
    expect(CV.slice(match?.start, match?.end)).toBe("170+ components")
  })
})
