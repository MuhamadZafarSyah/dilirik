import { describe, expect, it } from "vitest"
import { detectLanguage } from "../src/services/detectLanguage"

describe("detectLanguage", () => {
  it("mendeteksi CV bahasa Indonesia", () => {
    expect(
      detectLanguage(
        "Saya lulusan Informatika dengan pengalaman kerja sebagai developer dan bertanggung jawab mengembangkan aplikasi web untuk internal perusahaan pada tahun 2024.",
      ),
    ).toBe("id")
  })

  it("mendeteksi CV bahasa Inggris", () => {
    expect(
      detectLanguage(
        "Software engineer with 5 years of experience in building web applications and leading a team of four developers for enterprise clients.",
      ),
    ).toBe("en")
  })

  it("fallback ke en bila tidak ada marker", () => {
    expect(detectLanguage("React TypeScript Node.js PostgreSQL")).toBe("en")
  })
})
