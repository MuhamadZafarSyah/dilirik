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
