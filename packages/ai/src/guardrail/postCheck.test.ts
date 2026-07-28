import { describe, expect, it } from "vitest"
import type { CvStructured, Suggestion } from "@dilirik/shared"
import { postCheckSuggestion } from "./postCheck"

const cv: CvStructured = {
  fullName: "Rara",
  headline: "Fresh graduate Informatika",
  about: null,
  skills: ["JavaScript", "React"],
  experiences: [
    {
      title: "Asisten Lab Pemrograman",
      company: "Universitas X",
      period: "2024",
      highlights: ["Membimbing 30 mahasiswa praktikum JavaScript dasar"],
    },
  ],
  achievements: ["Juara 2 hackathon kampus"],
  education: [{ institution: "Universitas X", degree: "S1 Informatika", period: "2020-2024" }],
  sections: [],
}

const suggestion = (facts: string[]): Suggestion => ({
  section: "experience",
  before: "Asisten lab",
  after: "Membimbing 30 mahasiswa dalam praktikum JavaScript dasar",
  targetRequirement: "",
  basedOnFacts: facts,
})


describe("postCheckSuggestion (guardrail titik-3)", () => {
  it("menerima saran yang merujuk fakta asli CV", () => {
    const result = postCheckSuggestion(
      suggestion(["Membimbing 30 mahasiswa praktikum JavaScript dasar"]),
      cv,
    )
    expect(result.ok).toBe(true)
  })

  it("MENOLAK saran yang menyebut skill di luar CV (halusinasi)", () => {
    const result = postCheckSuggestion(suggestion(["5 tahun pengalaman Kubernetes"]), cv)
    expect(result.ok).toBe(false)
  })

  it("MENOLAK saran tanpa rujukan fakta", () => {
    const result = postCheckSuggestion(suggestion([]), cv)
    expect(result.ok).toBe(false)
  })

  it("toleran normalisasi (kapital/punktuasi)", () => {
    const result = postCheckSuggestion(suggestion(["juara 2 HACKATHON kampus"]), cv)
    expect(result.ok).toBe(true)
  })
})
