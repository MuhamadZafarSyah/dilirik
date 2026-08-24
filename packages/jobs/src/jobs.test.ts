import { describe, expect, it } from "vitest"
import { dedupeJobs, fingerprintOf, jaccard, shingles, weekOf } from "./dedupe.js"
import {
  extractSkillTerms,
  buildSnippet,
  normalizeCompany,
  normalizeJob,
  normalizeLocation,
  normalizeSalary,
  normalizeTitle,
} from "./normalize.js"
import type { RawJob } from "./providers/types.js"

function rawJob(overrides: Partial<RawJob> = {}): RawJob {
  return {
    providerId: "ats:greenhouse",
    sourceDisplayName: "Halaman karier Contoh (Greenhouse)",
    externalId: "greenhouse:contoh:1",
    title: "Senior Frontend Engineer",
    company: "PT Contoh Indonesia",
    location: "Jakarta Selatan, Indonesia",
    description: "Kami mencari engineer dengan React, TypeScript, dan Next.js.",
    postedAt: "2026-08-18T00:00:00.000Z",
    applyUrl: "https://contoh.test/apply/1",
    sourceUrl: "https://contoh.test/jobs/1",
    ...overrides,
  }
}

describe("normalizeTitle", () => {
  it("membuang kata pengganggu iklan lowongan", () => {
    expect(normalizeTitle("URGENT!! Frontend Developer (WFH) - Full Time")).toBe(
      "frontend developer",
    )
  })

  it("menyamakan singkatan seniority", () => {
    expect(normalizeTitle("Sr. Backend Engineer")).toBe("backend engineer")
  })
})

describe("normalizeCompany", () => {
  it("membuang bentuk badan usaha dan suffix negara", () => {
    expect(normalizeCompany("PT Gojek Indonesia Tbk")).toBe("gojek")
    expect(normalizeCompany("Xendit Inc.")).toBe("xendit")
  })

  it("tidak mengosongkan nama yang seluruhnya berupa kata umum", () => {
    expect(normalizeCompany("PT")).not.toBe("")
  })
})

describe("normalizeLocation", () => {
  it("memetakan wilayah Jakarta ke satu kota", () => {
    expect(normalizeLocation("Jakarta Selatan, Indonesia").city).toBe("Jakarta")
    expect(normalizeLocation("Jaksel").city).toBe("Jakarta")
    expect(normalizeLocation("DKI Jakarta").city).toBe("Jakarta")
  })

  it("mengenali alias populer", () => {
    expect(normalizeLocation("Jogja").city).toBe("Yogyakarta")
    expect(normalizeLocation("BSD City").city).toBe("Tangerang")
  })

  it("tidak menebak kota untuk lokasi tak dikenal", () => {
    expect(normalizeLocation("Remote - Anywhere").city).toBeNull()
  })
})

describe("normalizeSalary", () => {
  it("menukar min dan max yang tertukar", () => {
    expect(normalizeSalary({ min: 20_000_000, max: 10_000_000 })).toMatchObject({
      salaryMin: 10_000_000,
      salaryMax: 20_000_000,
    })
  })

  it("membuang nilai nol atau negatif", () => {
    expect(normalizeSalary({ min: 0, max: -5 })).toMatchObject({
      salaryMin: null,
      salaryMax: null,
    })
  })
})

describe("extractSkillTerms", () => {
  it("mengambil skill dari kamus tanpa LLM", () => {
    const skills = extractSkillTerms("Butuh React, TypeScript, dan pengalaman Docker.")
    expect(skills).toContain("react")
    expect(skills).toContain("typescript")
    expect(skills).toContain("docker")
  })

  it("tidak mengembalikan duplikat", () => {
    const skills = extractSkillTerms("react react react")
    expect(skills.filter((skill) => skill === "react")).toHaveLength(1)
  })
})

describe("buildSnippet", () => {
  it("memotong deskripsi panjang ke batas snippet", () => {
    const snippet = buildSnippet("a".repeat(2000))
    expect(snippet.length).toBeLessThanOrEqual(600)
  })
})

describe("weekOf", () => {
  it("memetakan tanggal dalam minggu yang sama ke kunci yang sama", () => {
    expect(weekOf("2026-08-18T09:00:00.000Z")).toBe(weekOf("2026-08-20T23:00:00.000Z"))
  })

  it("mengembalikan unknown untuk tanggal kosong", () => {
    expect(weekOf(null)).toBe("unknown")
  })
})

describe("jaccard", () => {
  it("memberi nilai tinggi untuk judul yang hampir sama", () => {
    const score = jaccard(shingles("frontend engineer"), shingles("frontend engineers"))
    expect(score).toBeGreaterThan(0.85)
  })
})

describe("dedupeJobs", () => {
  it("menggabungkan lowongan sama dari dua sumber dan menyimpan keduanya", () => {
    const merged = dedupeJobs([
      normalizeJob(rawJob()),
      normalizeJob(
        rawJob({
          providerId: "jooble",
          sourceDisplayName: "JobStreet (via Jooble)",
          externalId: "jooble:99",
          title: "Senior Frontend Engineer (WFH)",
          company: "Contoh",
          location: "Jakarta",
          applyUrl: "https://jooble.test/apply/99",
          sourceUrl: "https://jooble.test/jobs/99",
        }),
      ),
    ])

    expect(merged).toHaveLength(1)
    expect(merged[0]!.sources).toHaveLength(2)
  })

  it("memilih halaman karier resmi sebagai sumber utama", () => {
    const merged = dedupeJobs([
      normalizeJob(
        rawJob({
          providerId: "adzuna",
          sourceDisplayName: "Adzuna",
          externalId: "adzuna:1",
          company: "Contoh",
        }),
      ),
      normalizeJob(rawJob({ company: "Contoh" })),
    ])

    expect(merged).toHaveLength(1)
    expect(merged[0]!.primarySource).toBe("ats:greenhouse")
  })

  it("tidak menggabungkan lowongan dari perusahaan berbeda", () => {
    const merged = dedupeJobs([
      normalizeJob(rawJob({ company: "Contoh Satu" })),
      normalizeJob(rawJob({ company: "Perusahaan Lain Sekali", externalId: "x:2" })),
    ])

    expect(merged).toHaveLength(2)
  })

  it("fingerprint stabil untuk input yang sama", () => {
    const job = normalizeJob(rawJob())
    expect(fingerprintOf(job)).toBe(fingerprintOf(normalizeJob(rawJob())))
  })
})
