import { describe, expect, it } from "vitest"
import type { CvStructured, JobParsed } from "@dilirik/shared"
import { expandImplications, type SkillSource } from "./skillImplications"
import { collectImplicationSources, ruleBasedScore, skillCovered } from "./ruleBased"

/**
 * Builder longgar: hanya field yang benar-benar dibaca engine yang diisi.
 * Assertion ganda dipakai supaya tes tidak ikut rusak setiap kali schema CV
 * bertambah field yang tidak relevan dengan scoring.
 */
function makeCv(overrides: Record<string, unknown> = {}): CvStructured {
  return {
    fullName: "Kandidat Uji",
    headline: "",
    about: "",
    skills: [],
    experiences: [],
    education: [],
    achievements: [],
    sections: [],
    ...overrides,
  } as unknown as CvStructured
}

function makeJob(overrides: Record<string, unknown> = {}): JobParsed {
  return {
    jobTitle: "Frontend Developer",
    company: "PT Uji Coba",
    level: "junior",
    mustHaveSkills: [],
    niceToHaveSkills: [],
    requirements: [],
    keywords: [],
    ...overrides,
  } as unknown as JobParsed
}

const strong = (original: string, normalized: string): SkillSource => ({
  original,
  normalized,
  strong: true,
})

describe("expandImplications", () => {
  it("menelusuri rantai framework sampai ke fondasi web", () => {
    const implied = expandImplications([strong("Next.js", "next.js")])

    expect(implied.get("react")?.confidence).toBe("certain")
    expect(implied.get("html")?.confidence).toBe("certain")
    expect(implied.get("css")?.confidence).toBe("certain")
    expect(implied.get("javascript")?.confidence).toBe("certain")
  })

  it("membawa jalur penalaran dan sumbernya untuk ditampilkan sebagai bukti", () => {
    const implied = expandImplications([strong("SvelteKit", "sveltekit")])
    const html = implied.get("html")

    expect(html?.path).toEqual(["sveltekit", "svelte", "html"])
    expect(html?.sources).toContain("SvelteKit")
  })

  it("TIDAK PERNAH berjalan mundur \u2014 ini yang membedakannya dari alias", () => {
    // Menguasai HTML tidak menjamin apa pun soal React. Kalau tes ini merah,
    // artinya relasi turunan bocor kembali ke grup alias yang simetris, dan CV
    // desainer akan dianggap menguasai React & Next.js.
    const implied = expandImplications([strong("HTML", "html")])

    expect(implied.get("react")).toBeUndefined()
    expect(implied.get("next.js")).toBeUndefined()
    expect(implied.size).toBe(0)
  })

  it("Svelte tidak menyiratkan SvelteKit, hanya sebaliknya", () => {
    expect(expandImplications([strong("Svelte", "svelte")]).get("sveltekit")).toBeUndefined()
    expect(expandImplications([strong("SvelteKit", "sveltekit")]).get("svelte")?.confidence).toBe(
      "certain",
    )
  })

  it("mengambil keyakinan terlemah di sepanjang rantai", () => {
    // react \u2192 git adalah edge "likely", jadi kesimpulannya ikut turun derajat
    // walaupun next.js \u2192 react sendiri "certain".
    const implied = expandImplications([strong("Next.js", "next.js")])
    expect(implied.get("git")?.confidence).toBe("likely")
  })

  it("menurunkan derajat skill yang cuma dicantumkan tanpa jejak pengalaman", () => {
    // Penjaga inflasi: menulis "Next.js" setelah satu tutorial tidak boleh
    // memanen react + html + css + javascript dengan bobot penuh.
    const implied = expandImplications([
      { original: "Next.js", normalized: "next.js", strong: false },
    ])

    expect(implied.get("html")?.confidence).toBe("likely")
    expect(implied.get("git")).toBeUndefined()
  })
})

describe("collectImplicationSources", () => {
  it("membaca skill dari kalimat pengalaman, bukan cuma daftar skill", () => {
    const cv = makeCv({
      skills: ["TypeScript"],
      experiences: [
        {
          title: "Frontend Developer",
          company: "PT Traspac",
          highlights: ["Membangun back-office dengan Nuxt 3, Vue 3, dan TypeScript"],
        },
      ],
    })

    const sources = collectImplicationSources(cv)
    const nuxt = sources.find((s) => s.normalized === "nuxt")

    expect(nuxt).toBeDefined()
    expect(nuxt?.strong).toBe(true)
    expect(nuxt?.original).toBe("Nuxt")
  })

  it("menandai lemah skill yang hanya muncul di daftar skill", () => {
    const cv = makeCv({ skills: ["React"] })
    expect(collectImplicationSources(cv).find((s) => s.normalized === "react")?.strong).toBe(false)
  })
})

describe("skillCovered \u2014 tetap harfiah, tidak boleh tahu soal implikasi", () => {
  it("tidak menganggap HTML sebagai bukti Next.js", () => {
    expect(skillCovered("Next.js", ["HTML", "CSS"])).toBe(false)
  })

  it("tidak menganggap SvelteKit sebagai penulisan lain dari Svelte", () => {
    expect(skillCovered("Svelte", ["SvelteKit"])).toBe(false)
  })

  it("tetap mengenali penulisan versi", () => {
    expect(skillCovered("HTML5", ["HTML"])).toBe(true)
  })
})

/**
 * Kasus #1 gold set \u2014 diambil apa adanya dari laporan bug nyata:
 * CV frontend penuh Next.js/SvelteKit/Nuxt yang tidak pernah menulis kata
 * "HTML", divonis "gap beneran: tidak ada bukti pengalaman HTML".
 */
describe("ruleBasedScore \u2014 regresi gap palsu pada CV frontend", () => {
  const cv = makeCv({
    headline: "Software Engineer",
    about:
      "Frontend Developer dengan pengalaman membangun aplikasi web memakai Next.js, React, dan SvelteKit.",
    skills: [
      "Next.js",
      "React",
      "Nuxt.js",
      "Vue.js",
      "SvelteKit",
      "TypeScript",
      "JavaScript",
      "Tailwind CSS",
      "Node.js",
      "Laravel",
    ],
    experiences: [
      {
        title: "Frontend Developer",
        company: "PT Traspac Makmur Sejahtera",
        highlights: [
          "Membangun sistem persuratan dengan SvelteKit dan TypeScript: 21 halaman, 60+ komponen",
          "Mengembangkan back-office HaloMasjid memakai Nuxt 3 dan Vue 3: 13 modul, 170+ komponen",
          "Membuat responsive interfaces untuk 100+ komponen reusable",
        ],
      },
    ],
  })

  it("tidak lagi menuduh kandidat tidak bisa HTML", () => {
    const job = makeJob({ mustHaveSkills: ["HTML", "CSS", "JavaScript", "React"] })
    const result = ruleBasedScore(cv, job)

    expect(result.missingMust).toEqual([])
    expect(result.impliedMust.map((i) => i.skill)).toContain("HTML")
  })

  it("menyertakan bukti yang bisa disebut di kalimat UI", () => {
    const job = makeJob({ mustHaveSkills: ["HTML"] })
    const html = ruleBasedScore(cv, job).impliedMust[0]

    expect(html?.confidence).toBe("certain")
    expect(html?.evidence.length).toBeGreaterThan(0)
  })

  it("memberi bobot penuh untuk implikasi yang pasti", () => {
    const job = makeJob({ mustHaveSkills: ["HTML", "CSS", "JavaScript"] })
    expect(ruleBasedScore(cv, job).score).toBe(100)
  })

  it("Git jadi implikasi lemah, bukan kekurangan \u2014 CV ini tidak pernah menulis kata Git", () => {
    const job = makeJob({ mustHaveSkills: ["Git"] })
    const result = ruleBasedScore(cv, job)

    expect(result.missingMust).toEqual([])
    expect(result.impliedMust[0]?.confidence).toBe("likely")
    // Bobot parsial: tidak sepenuhnya dipercaya, tapi jauh lebih benar daripada nol.
    expect(result.score).toBe(60)
  })

  it("CSS tetap cocok harfiah lewat \"Tailwind CSS\"", () => {
    const job = makeJob({ mustHaveSkills: ["CSS"] })
    expect(ruleBasedScore(cv, job).matchedMust).toEqual(["CSS"])
  })

  it("memecah requirement majemuk HTML/CSS", () => {
    const job = makeJob({ mustHaveSkills: ["HTML/CSS"] })
    const result = ruleBasedScore(cv, job)

    expect(result.missingMust).toEqual([])
    expect(result.impliedMust[0]?.skill).toBe("HTML/CSS")
  })

  it("TIDAK memecah istilah yang kebetulan mengandung garis miring", () => {
    // "ci/cd" dan "ui/ux" adalah satu istilah utuh. Kalau dipecah membabi buta,
    // keduanya langsung rusak dan berubah jadi gap palsu jenis baru.
    const job = makeJob({ mustHaveSkills: ["CI/CD", "UI/UX"] })
    const result = ruleBasedScore(cv, job)

    expect(result.missingMust).toEqual(["CI/CD", "UI/UX"])
  })

  it("skill yang benar-benar tidak ada tetap dilaporkan sebagai kekurangan", () => {
    // Jaring pengaman arah sebaliknya: perbaikan ini tidak boleh membuat engine
    // jadi tukang stempel yang meloloskan apa saja.
    const job = makeJob({ mustHaveSkills: ["Kubernetes", "Go", "Machine Learning"] })
    const result = ruleBasedScore(cv, job)

    expect(result.missingMust).toEqual(["Kubernetes", "Go", "Machine Learning"])
    expect(result.impliedMust).toEqual([])
    expect(result.score).toBe(0)
  })
})
