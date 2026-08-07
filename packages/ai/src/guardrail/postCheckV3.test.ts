import { describe, expect, it } from "vitest"
import type { JobParsed, Suggestion } from "@dilirik/shared"
import {
  dedupeSuggestions,
  postCheckAnchor,
  postCheckBannedPhrases,
  postCheckUsefulness,
} from "./postCheck"

const job: JobParsed = {
  jobTitle: "Social Media Specialist",
  company: null,
  level: null,
  mustHaveSkills: ["Instagram", "Copywriting"],
  niceToHaveSkills: ["Canva"],
  requirements: ["Menyusun konten media sosial dan membaca performa konten"],
  keywords: ["konten", "performa"],
}

const RAW_CV = [
  "PENGALAMAN",
  "Staf Media Kampus (2024)",
  "Mengelola akun Instagram organisasi kampus",
  "Menulis caption harian",
].join("\n")

const suggestion = (over: Partial<Suggestion> = {}): Suggestion => ({
  section: "experience",
  before: "Mengelola akun Instagram organisasi kampus",
  after: "Mengelola akun Instagram organisasi kampus dengan 3 posting konten per minggu",
  basedOnFacts: ["Mengelola akun Instagram organisasi kampus"],
  targetRequirement: "Menyusun konten media sosial",
  addressesGap: ["Instagram"],
  whatChanged: ["added_scope"],
  rationale: "Menegaskan kadensi konten yang diminta lowongan.",
  impact: "high",
  ...over,
})

describe("postCheckAnchor (guardrail jangkar)", () => {
  it("menerima kutipan verbatim", () => {
    expect(postCheckAnchor(suggestion(), RAW_CV).ok).toBe(true)
  })

  it("toleran terhadap perbedaan whitespace hasil ekstraksi PDF", () => {
    const s = suggestion({ before: "Mengelola akun Instagram\n  organisasi kampus" })
    expect(postCheckAnchor(s, RAW_CV).ok).toBe(true)
  })

  it("MENOLAK jangkar hasil parafrase (tidak bisa auto-replace)", () => {
    const s = suggestion({ before: "Mengurus media sosial kampus" })
    expect(postCheckAnchor(s, RAW_CV).ok).toBe(false)
  })

  it("MENOLAK jangkar kosong", () => {
    expect(postCheckAnchor(suggestion({ before: "   " }), RAW_CV).ok).toBe(false)
  })
})

describe("postCheckBannedPhrases", () => {
  it("MENOLAK kata sifat memuji diri", () => {
    const s = suggestion({ after: "Highly skilled content creator untuk akun kampus" })
    expect(postCheckBannedPhrases(s).ok).toBe(false)
  })

  it("MENOLAK klise berbahasa Indonesia", () => {
    const s = suggestion({ after: "Sangat ahli mengelola akun Instagram kampus" })
    expect(postCheckBannedPhrases(s).ok).toBe(false)
  })

  it("meloloskan kalimat faktual", () => {
    expect(postCheckBannedPhrases(suggestion()).ok).toBe(true)
  })
})

describe("postCheckUsefulness (verifikasi klaim whatChanged)", () => {
  it("meloloskan saran yang klaimnya terbukti", () => {
    expect(postCheckUsefulness(suggestion(), job).ok).toBe(true)
  })

  it("MENOLAK no-op", () => {
    const s = suggestion({ after: "Mengelola akun Instagram organisasi kampus" })
    expect(postCheckUsefulness(s, job).ok).toBe(false)
  })

  it("MENOLAK saran tanpa targetRequirement", () => {
    expect(postCheckUsefulness(suggestion({ targetRequirement: "" }), job).ok).toBe(false)
  })

  it("MENOLAK whatChanged kosong (klaim tidak bisa diverifikasi)", () => {
    expect(postCheckUsefulness(suggestion({ whatChanged: [] }), job).ok).toBe(false)
  })

  it("MENOLAK klaim added_metric tanpa angka baru", () => {
    const s = suggestion({
      after: "Mengelola akun Instagram organisasi kampus secara rutin",
      whatChanged: ["added_metric"],
    })
    expect(postCheckUsefulness(s, job).ok).toBe(false)
  })

  it("menerima klaim added_metric yang benar-benar memunculkan angka", () => {
    const s = suggestion({
      after: "Mengelola akun Instagram organisasi kampus: 2.400 follower dalam 6 bulan",
      whatChanged: ["added_metric"],
    })
    expect(postCheckUsefulness(s, job).ok).toBe(true)
  })

  it("tidak lagi menghukum kalimat yang tidak menyebut istilah lowongan (anti keyword stuffing)", () => {
    const s = suggestion({
      after: "Mengelola akun Instagram organisasi kampus bersama 4 anggota divisi",
      whatChanged: ["added_scope"],
    })
    expect(postCheckUsefulness(s, job).ok).toBe(true)
  })
})

describe("dedupeSuggestions", () => {
  it("membuang saran dengan jangkar yang bertabrakan", () => {
    const a = suggestion()
    const b = suggestion({ after: "Mengelola akun Instagram organisasi kampus dan komunitas" })
    const { kept, dropped } = dedupeSuggestions([a, b])
    expect(kept).toHaveLength(1)
    expect(dropped).toHaveLength(1)
  })

  it("mempertahankan saran dengan jangkar berbeda", () => {
    const a = suggestion()
    const b = suggestion({
      before: "Menulis caption harian",
      after: "Menulis caption harian untuk 3 kanal media sosial",
      basedOnFacts: ["Menulis caption harian"],
    })
    expect(dedupeSuggestions([a, b]).kept).toHaveLength(2)
  })
})
