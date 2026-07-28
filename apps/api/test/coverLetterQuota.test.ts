import { describe, expect, it, vi } from "vitest"
import { checkCoverLetterEntitlement } from "../src/services/coverLetterQuota.js"
import { prisma } from "@dilirik/db"

vi.mock("@dilirik/db", () => ({
  prisma: {
    user: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
  },
}))

describe("checkCoverLetterEntitlement", () => {
  it("returns allowed when usage is below quota limit", async () => {
    vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValueOnce({
      coverLetterQuota: 3,
      coverLetterUsedThisPeriod: 1,
      coverLetterQuotaResetAt: new Date(Date.now() + 86400000),
    } as any)

    const res = await checkCoverLetterEntitlement("user-1")
    expect(res.allowed).toBe(true)
    expect(res.remaining).toBe(2)
  })

  it("returns disallowed when usage reaches quota limit", async () => {
    vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValueOnce({
      coverLetterQuota: 3,
      coverLetterUsedThisPeriod: 3,
      coverLetterQuotaResetAt: new Date(Date.now() + 86400000),
    } as any)

    const res = await checkCoverLetterEntitlement("user-1")
    expect(res.allowed).toBe(false)
    expect(res.remaining).toBe(0)
  })
})
