import { describe, expect, it } from "vitest"
import { countWords } from "./generateCoverLetter"

describe("countWords", () => {
  it("counts words correctly in text", () => {
    expect(countWords("Halo nama saya Budi Santoso")).toBe(5)
    expect(countWords("   Budi   Santoso \n  Yogyakarta  ")).toBe(3)
    expect(countWords("")).toBe(0)
  })
})
