import { describe, expect, it } from "vitest"
import type { CoverLetterDraft, CoverLetterParagraph, CvStructured } from "@dilirik/shared"
import {
  filterCoverLetterDraft,
  postCheckCoverLetterParagraph,
  renderCoverLetterText,
} from "./postCheck"

const cv = {
  fullName: "Budi Santoso",
  headline: "Backend Engineer",
  about: "Backend engineer yang fokus di API dan basis data.",
  skills: ["TypeScript", "PostgreSQL", "Express"],
  achievements: ["Menurunkan latensi API checkout sebesar 40%"],
  experiences: [
    {
      title: "Backend Engineer",
      company: "Tokoku",
      highlights: ["Membangun layanan pembayaran dengan Express dan PostgreSQL"],
    },
  ],
  education: [{ institution: "Universitas Brawijaya", degree: "S1 Teknik Informatika" }],
  sections: [],
} as unknown as CvStructured

function paragraph(overrides: Partial<CoverLetterParagraph>): CoverLetterParagraph {
  return {
    text: "Saya membangun layanan pembayaran memakai Express dan PostgreSQL di Tokoku.",
    evidenceFromCv: ["Membangun layanan pembayaran dengan Express dan PostgreSQL"],
    targetRequirement: "Pengalaman Node.js dan PostgreSQL",
    ...overrides,
  }
}

describe("postCheckCoverLetterParagraph", () => {
  it("menerima paragraf yang buktinya ada di CV", () => {
    expect(postCheckCoverLetterParagraph(paragraph({}), cv).ok).toBe(true)
  })

  it("menerima bukti yang hanya sebagian cocok (toleran normalisasi)", () => {
    const result = postCheckCoverLetterParagraph(
      paragraph({ evidenceFromCv: ["PostgreSQL"] }),
      cv,
    )
    expect(result.ok).toBe(true)
  })

  it("menolak klaim skill yang tidak ada di CV", () => {
    const result = postCheckCoverLetterParagraph(
      paragraph({ evidenceFromCv: ["Sertifikasi AWS Solutions Architect"] }),
      cv,
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain("tidak ditemukan di CV")
  })

  it("menolak paragraf tanpa bukti sama sekali", () => {
    const result = postCheckCoverLetterParagraph(paragraph({ evidenceFromCv: [] }), cv)
    expect(result.ok).toBe(false)
  })

  it("menolak paragraf yang masih mengandung placeholder", () => {
    const result = postCheckCoverLetterParagraph(
      paragraph({ text: "Saya tertarik bergabung dengan [Nama Perusahaan]." }),
      cv,
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain("placeholder")
  })
})

describe("filterCoverLetterDraft", () => {
  const draft: CoverLetterDraft = {
    greeting: "Yth. Tim Rekrutmen Acme,",
    opening: "Saya ingin melamar posisi Backend Engineer.",
    bodyParagraphs: [
      paragraph({}),
      paragraph({ evidenceFromCv: ["Memimpin tim beranggotakan 20 orang"] }),
    ],
    closing: "Saya terbuka untuk berdiskusi lebih lanjut.",
    signOff: "Hormat saya,\nBudi Santoso",
  }

  it("membuang paragraf yang mengarang dan menyimpan alasannya", () => {
    const result = filterCoverLetterDraft(draft, cv)
    expect(result.draft.bodyParagraphs).toHaveLength(1)
    expect(result.rejected).toHaveLength(1)
    expect(result.rejected[0]!.reason).toContain("Memimpin tim")
  })

  it("merender teks final tanpa paragraf yang ditolak", () => {
    const text = renderCoverLetterText(filterCoverLetterDraft(draft, cv).draft)
    expect(text).toContain("Yth. Tim Rekrutmen Acme,")
    expect(text).toContain("layanan pembayaran")
    expect(text).not.toContain("20 orang")
    expect(text.split("\n\n")).toHaveLength(5)
  })
})
