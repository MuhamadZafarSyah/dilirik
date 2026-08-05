import { describe, expect, it } from "vitest"
import type { CvStructured, JobParsed } from "@dilirik/shared"
import { ruleBasedScore } from "./ruleBased"

const cv = (skills: string[]): CvStructured => ({
  fullName: "Tester",
  headline: null,
  about: null,
  skills,
  experiences: [],
  achievements: [],
  education: [],
  sections: [],
})

const cvWith = (over: Partial<CvStructured>): CvStructured => ({ ...cv([]), ...over })

const job = (must: string[], nice: string[] = []): JobParsed => ({
  jobTitle: "FE Engineer",
  company: null,
  level: null,
  mustHaveSkills: must,
  niceToHaveSkills: nice,
  requirements: [],
  keywords: [],
})

describe("ruleBasedScore", () => {
  it("memberi 100 saat semua skill wajib & opsional cocok", () => {
    const r = ruleBasedScore(cv(["React", "TypeScript", "Jest"]), job(["React", "TypeScript"], ["Jest"]))
    expect(r.score).toBe(100)
    expect(r.missingMust).toHaveLength(0)
  })

  it("memberi 0 saat tidak ada yang cocok", () => {
    const r = ruleBasedScore(cv(["Photoshop"]), job(["React", "Node.js"]))
    expect(r.score).toBe(0)
    expect(r.missingMust).toEqual(["React", "Node.js"])
  })

  it("deterministik — input sama, skor sama", () => {
    const a = ruleBasedScore(cv(["React"]), job(["React", "Vue"]))
    const b = ruleBasedScore(cv(["React"]), job(["React", "Vue"]))
    expect(a.score).toBe(b.score)
  })

  it("bobot wajib > opsional", () => {
    const onlyMust = ruleBasedScore(cv(["React"]), job(["React"], ["GraphQL"]))
    const onlyNice = ruleBasedScore(cv(["GraphQL"]), job(["React"], ["GraphQL"]))
    expect(onlyMust.score).toBeGreaterThan(onlyNice.score)
  })

  it("netral 50 bila lowongan tanpa skill terdeteksi", () => {
    expect(ruleBasedScore(cv(["React"]), job([])).score).toBe(50)
  })

  it("case-insensitive & toleran variasi", () => {
    const r = ruleBasedScore(cv(["react", "node.js"]), job(["React", "Node.js"]))
    expect(r.score).toBe(100)
  })
})

describe("ruleBasedScore — regresi false positive (engine v3)", () => {
  it("Java TIDAK dianggap tercakup oleh JavaScript", () => {
    const r = ruleBasedScore(cv(["JavaScript", "React"]), job(["Java"]))
    expect(r.matchedMust).toEqual([])
    expect(r.score).toBe(0)
  })

  it("R TIDAK dianggap tercakup oleh kata Retail", () => {
    const r = ruleBasedScore(cv(["Retail Management"]), job(["R"]))
    expect(r.score).toBe(0)
  })

  it("Go TIDAK dianggap tercakup oleh frasa 'go to market' di pengalaman", () => {
    const candidate = cvWith({
      skills: ["Copywriting"],
      experiences: [
        {
          title: "Marketing Intern",
          company: "PT Contoh",
          period: "2025",
          highlights: ["Menyusun go to market strategy untuk produk baru"],
        },
      ],
    })
    expect(ruleBasedScore(candidate, job(["Go"])).score).toBe(0)
  })

  it("AI TIDAK dianggap tercakup oleh kata Mail", () => {
    const r = ruleBasedScore(cv(["Email Marketing"]), job(["AI"]))
    expect(r.score).toBe(0)
  })

  it("alias sah tetap dikenali: JS → JavaScript", () => {
    expect(ruleBasedScore(cv(["JS"]), job(["JavaScript"])).score).toBe(100)
  })

  it("alias sah tetap dikenali: Postgres → PostgreSQL", () => {
    expect(ruleBasedScore(cv(["Postgres"]), job(["PostgreSQL"])).score).toBe(100)
  })

  it("alias sah tetap dikenali: pemasaran digital → Digital Marketing", () => {
    expect(ruleBasedScore(cv(["Pemasaran Digital"]), job(["Digital Marketing"])).score).toBe(100)
  })

  it("skill multi-kata dicocokkan sebagai frasa utuh", () => {
    expect(ruleBasedScore(cv(["Google Ads"]), job(["Google Ads"])).score).toBe(100)
    expect(ruleBasedScore(cv(["Google Analytics"]), job(["Google Ads"])).score).toBe(0)
  })

  it("skill di pengalaman tetap terhitung (korpus luas)", () => {
    const candidate = cvWith({
      skills: [],
      experiences: [
        {
          title: "Frontend Developer",
          company: "PT Contoh",
          period: "2025",
          highlights: ["Membangun dashboard dengan React dan TypeScript"],
        },
      ],
    })
    expect(ruleBasedScore(candidate, job(["React"])).score).toBe(100)
  })
})
