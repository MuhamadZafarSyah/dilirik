import { describe, expect, it } from "vitest"
import { resolveReportLanguage } from "./language"

describe("resolveReportLanguage", () => {
  it("mendahulukan pilihan eksplisit pengguna di atas header browser", () => {
    expect(
      resolveReportLanguage({ requested: "id", acceptLanguage: "en-US,en;q=0.9" }),
    ).toBe("id")
  })

  it("memakai Accept-Language ketika klien belum mengirim pilihan", () => {
    expect(resolveReportLanguage({ acceptLanguage: "en-US,en;q=0.9,id;q=0.8" })).toBe("en")
  })

  it("menghormati bobot q, bukan urutan penulisan", () => {
    expect(resolveReportLanguage({ acceptLanguage: "en;q=0.4,id;q=0.9" })).toBe("id")
  })

  it("membuang bahasa ber-q=0 — itu penolakan, bukan prioritas terendah", () => {
    expect(resolveReportLanguage({ acceptLanguage: "en;q=0" })).toBe("id")
  })

  it("menyamakan varian regional dengan bahasa dasarnya", () => {
    expect(resolveReportLanguage({ requested: "en-US" })).toBe("en")
    expect(resolveReportLanguage({ acceptLanguage: "id-ID" })).toBe("id")
  })

  it("mengabaikan wildcard dan bahasa yang belum didukung", () => {
    expect(resolveReportLanguage({ acceptLanguage: "*" })).toBe("id")
    expect(resolveReportLanguage({ acceptLanguage: "ja-JP,ko;q=0.9" })).toBe("id")
  })

  it("default ke bahasa Indonesia saat tidak ada petunjuk sama sekali", () => {
    expect(resolveReportLanguage({})).toBe("id")
    expect(resolveReportLanguage({ requested: null, acceptLanguage: null })).toBe("id")
    expect(resolveReportLanguage({ requested: "", acceptLanguage: "" })).toBe("id")
  })
})
