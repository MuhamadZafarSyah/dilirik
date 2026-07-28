import { describe, expect, it } from "vitest"
import { scoreTone, DEFAULT_COVER_LETTER_QUOTA, COVER_LETTER_TEMPLATES } from "./constants"

describe("shared constants", () => {
  it("evaluates scoreTone correctly", () => {
    expect(scoreTone(40)).toBe("red")
    expect(scoreTone(60)).toBe("yellow")
    expect(scoreTone(85)).toBe("green")
  })

  it("has cover letter defaults", () => {
    expect(DEFAULT_COVER_LETTER_QUOTA).toBe(3)
    expect(COVER_LETTER_TEMPLATES).toContain("professional")
  })
})
