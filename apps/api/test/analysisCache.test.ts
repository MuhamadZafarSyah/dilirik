import { describe, expect, it } from "vitest"
import { analysisCacheKey } from "../src/services/analysisCache"

describe("analysisCacheKey", () => {
  it("deterministik untuk input sama", () => {
    expect(analysisCacheKey("cv", "job", "1.0.0")).toBe(analysisCacheKey("cv", "job", "1.0.0"))
  })
  it("berbeda bila engineVersion berubah (invalidasi)", () => {
    expect(analysisCacheKey("cv", "job", "1.0.0")).not.toBe(analysisCacheKey("cv", "job", "1.1.0"))
  })
  it("berbeda bila CV atau lowongan berubah", () => {
    expect(analysisCacheKey("cv-a", "job", "1.0.0")).not.toBe(analysisCacheKey("cv-b", "job", "1.0.0"))
    expect(analysisCacheKey("cv", "job-a", "1.0.0")).not.toBe(analysisCacheKey("cv", "job-b", "1.0.0"))
  })
})
