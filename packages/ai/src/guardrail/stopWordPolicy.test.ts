import { describe, expect, it } from "vitest"
import type { JobParsed, Suggestion } from "@dilirik/shared"
import { findConceptEvidence } from "../scoring/conceptEvidence"
import {
  distinctiveTokens,
  partitionBannedSentences,
  postCheckUsefulness,
  stripBannedSentences,
} from "./postCheck"

/**
 * v3.3.2 — satu daftar kata umum dulu dipakai bersama oleh dua pemeriksaan yang
 * kebutuhannya berlawanan. Berkas ini mengunci kedua sisinya sekaligus, supaya
 * penyetelan untuk satu sisi tidak bisa lagi diam-diam merusak sisi lain.
 */

describe("GENERIC_WORDS — sisi BUKTI (harus murah hati)", () => {
  it("tidak menjadikan kata umum sebagai jangkar bukti", () => {
    expect(distinctiveTokens("Software Architecture")).toEqual(["architecture"])
    expect(distinctiveTokens("Web Service")).toEqual([])
    expect(distinctiveTokens("User Research")).toEqual(["research"])
  })

  it('headline "Software Engineer" BUKAN bukti untuk requirement Software Architecture', () => {
    const corpus = ["Software Engineer", "Membangun REST API dengan Express.js"]
    expect(findConceptEvidence("Software Architecture", corpus)).toEqual([])
  })

  it('kata "user" yang kebetulan muncul BUKAN bukti untuk User Research', () => {
    const corpus = ["Mengembangkan user authentication dengan JWT"]
    expect(findConceptEvidence("User Research", corpus)).toEqual([])
  })

  it("bukti yang sah tetap ditemukan lewat peta konsep", () => {
    const corpus = ["Membangun sistem Persuratan TNI-AD dengan PaddleOCR"]
    expect(findConceptEvidence("OCR", corpus).length).toBeGreaterThan(0)
  })
})

const job: JobParsed = {
  jobTitle: "Account Executive",
  company: null,
  level: null,
  mustHaveSkills: ["Account Management"],
  niceToHaveSkills: [],
  requirements: ["Mengelola portofolio klien korporat"],
  keywords: ["klien"],
}

const suggestion = (over: Partial<Suggestion> = {}): Suggestion => ({
  section: "experience",
  before: "Melayani 30 klien ritel",
  after: "Melayani 12 klien korporat",
  basedOnFacts: ["Melayani 30 klien ritel"],
  targetRequirement: "Account Management",
  addressesGap: ["Account Management"],
  whatChanged: ["added_metric"],
  rationale: "Mempertegas skala portofolio klien.",
  impact: "high",
  ...over,
})

describe("postCheckUsefulness — angka baru diukur dari angkanya, bukan jumlah digit", () => {
  it("menerima angka yang berubah walau jumlah digitnya sama", () => {
    expect(postCheckUsefulness(suggestion(), job).ok).toBe(true)
  })

  it('menerima perubahan satu digit seperti "3" menjadi "5"', () => {
    const s = suggestion({
      before: "Menulis 3 artikel per bulan",
      after: "Menulis 5 artikel per bulan",
      basedOnFacts: ["Menulis 3 artikel per bulan"],
    })
    expect(postCheckUsefulness(s, job).ok).toBe(true)
  })

  it("MENOLAK klaim added_metric yang tidak membawa angka apa pun", () => {
    const s = suggestion({ after: "Melayani klien korporat berskala besar" })
    expect(postCheckUsefulness(s, job).ok).toBe(false)
  })

  it("MENOLAK klaim added_metric yang angkanya sama persis", () => {
    const s = suggestion({ after: "Melayani 30 klien ritel dan korporat" })
    expect(postCheckUsefulness(s, job).ok).toBe(false)
  })
})

describe("partitionBannedSentences — penyaringan careerNote tidak lagi senyap", () => {
  it("melaporkan kalimat yang dibuang beserta sisa yang bersih", () => {
    const result = partitionBannedSentences(
      "Kandidat ini punya strong background di frontend. Portofolionya memuat 100+ komponen reusable.",
    )
    expect(result.kept).toBe("Portofolionya memuat 100+ komponen reusable.")
    expect(result.dropped).toHaveLength(1)
    expect(result.dropped[0]).toContain("strong background")
  })

  it("melaporkan seluruh kalimat sebagai terbuang bila semuanya klise", () => {
    const result = partitionBannedSentences("Kamu seorang team player yang passionate about teknologi.")
    expect(result.kept).toBe("")
    expect(result.dropped).toHaveLength(1)
  })

  it("tidak melaporkan apa pun untuk teks yang bersih", () => {
    const result = partitionBannedSentences("Portofoliomu sudah kuat di sisi frontend.")
    expect(result.kept).toBe("Portofoliomu sudah kuat di sisi frontend.")
    expect(result.dropped).toEqual([])
  })

  it("stripBannedSentences tetap mengembalikan bagian yang bersih saja", () => {
    const text = "Kandidat ini punya strong background di frontend. Portofolionya memuat 100+ komponen reusable."
    expect(stripBannedSentences(text)).toBe(partitionBannedSentences(text).kept)
  })
})
