import { describe, expect, it } from "vitest"
import type { JobParsed, Suggestion } from "@dilirik/shared"
import { postCheckUsefulness } from "./postCheck"

/**
 * Bug 8 — "added_scope" dulu satu-satunya klaim whatChanged yang lolos tanpa
 * diverifikasi, sehingga jadi label teraman untuk perubahan apa pun.
 */

const job: JobParsed = {
  jobTitle: "Social Media Specialist",
  company: null,
  level: null,
  mustHaveSkills: ["Instagram", "Copywriting"],
  niceToHaveSkills: ["Canva"],
  requirements: ["Menyusun konten media sosial dan membaca performa konten"],
  keywords: ["konten", "performa"],
}

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

describe("postCheckUsefulness — verifikasi klaim added_scope", () => {
  it("meloloskan klaim yang membawa angka baru", () => {
    expect(postCheckUsefulness(suggestion(), job).ok).toBe(true)
  })

  it("meloloskan klaim tanpa angka bila membawa kata bermakna yang baru", () => {
    const s = suggestion({
      after: "Mengelola akun Instagram organisasi kampus lewat kalender editorial mingguan",
    })
    expect(postCheckUsefulness(s, job).ok).toBe(true)
  })

  it("MENOLAK klaim yang cuma menambah kata sambung dan istilah umum", () => {
    const s = suggestion({
      after: "Mengelola akun dan sistem Instagram organisasi kampus dengan tim",
    })
    const result = postCheckUsefulness(s, job)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain("cakupan")
  })

  it("MENOLAK klaim yang hanya menambah satu kata bermakna", () => {
    const s = suggestion({
      after: "Mengelola akun Instagram dan sistem organisasi kampus profesional",
    })
    expect(postCheckUsefulness(s, job).ok).toBe(false)
  })

  it("angka baru menyelamatkan klaim walau sisa katanya umum", () => {
    const s = suggestion({
      after: "Mengelola akun dan sistem Instagram organisasi kampus dengan 4 tim",
    })
    expect(postCheckUsefulness(s, job).ok).toBe(true)
  })

  it("tidak menerapkan aturan cakupan pada klaim whatChanged lain", () => {
    const s = suggestion({
      after: "Mengelola akun dan sistem Instagram organisasi kampus dengan tim",
      whatChanged: ["reordered_for_relevance"],
    })
    expect(postCheckUsefulness(s, job).ok).toBe(true)
  })
})
