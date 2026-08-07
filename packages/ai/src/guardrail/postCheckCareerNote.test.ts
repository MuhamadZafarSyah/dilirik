import { describe, expect, it } from "vitest"
import { findBannedPhrase, stripBannedSentences } from "./postCheck"

/**
 * Bug 9 — pemeriksaan frasa klise dulu hanya menyentuh `after` sebuah saran,
 * sehingga careerNote jadi satu-satunya teks bebas yang tidak pernah diperiksa.
 */

describe("findBannedPhrase", () => {
  it("mengembalikan label frasa yang ditemukan", () => {
    expect(findBannedPhrase("Kandidat punya strong background di frontend")).toBe(
      "strong background",
    )
  })

  it("mendeteksi klise berbahasa Indonesia", () => {
    expect(findBannedPhrase("Dia pekerja keras dan rajin")).toBe("pekerja keras")
  })

  it("mengembalikan null untuk teks yang bersih", () => {
    expect(findBannedPhrase("Sudah membangun 170+ komponen di dua platform produksi")).toBeNull()
  })
})

describe("stripBannedSentences", () => {
  it("membuang hanya kalimat yang bermasalah dan menyisakan sisanya", () => {
    const note =
      "Kandidat punya strong background di frontend. Sudah membangun 170+ komponen di dua platform produksi."
    const result = stripBannedSentences(note)
    expect(result).not.toContain("strong background")
    expect(result).toContain("170+ komponen")
  })

  it("mengembalikan teks apa adanya bila tidak ada yang dibuang", () => {
    const note = "Sudah membangun 170+ komponen di dua platform produksi."
    expect(stripBannedSentences(note)).toBe(note)
  })

  it("merapatkan spasi setelah ada kalimat yang dibuang", () => {
    const note = "Portofolionya kuat.  Dia team player.  Tinggal menamai skill-nya."
    expect(stripBannedSentences(note)).toBe("Portofolionya kuat. Tinggal menamai skill-nya.")
  })

  it("mengembalikan string kosong bila semua kalimat bermasalah", () => {
    const note = "Highly skilled engineer. Proven track record di banyak proyek."
    expect(stripBannedSentences(note)).toBe("")
  })

  it("menangani kalimat tunggal tanpa tanda baca akhir", () => {
    expect(stripBannedSentences("Kandidat ini team player sejati")).toBe("")
  })

  it("aman untuk teks kosong", () => {
    expect(stripBannedSentences("")).toBe("")
  })
})
