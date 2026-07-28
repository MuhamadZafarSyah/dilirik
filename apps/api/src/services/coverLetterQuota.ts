import { prisma } from "@dilirik/db"
import { DEFAULT_COVER_LETTER_QUOTA } from "@dilirik/shared"
import { HttpError } from "../middleware/errorHandler"

/**
 * Kuota cover letter — TERPISAH dari kuota analisis & interview supaya biaya
 * tiap modul bisa diatur sendiri. Pola & semantik identik dengan `quota.ts`:
 * null = unlimited, reset otomatis tiap awal bulan.
 */
export type CoverLetterEntitlement = {
  allowed: boolean
  quota: number | null // null = unlimited
  used: number
  remaining: number | null
  resetAt: Date
}

function nextResetDate(from = new Date()): Date {
  return new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1))
}

/** Kode error sengaja QUOTA_EXCEEDED — frontend `isQuotaExceeded()` sudah mengenalinya. */
export function coverLetterQuotaExceeded(): HttpError {
  return new HttpError(429, "QUOTA_EXCEEDED", "Kuota cover letter bulan ini habis")
}

export async function checkCoverLetterEntitlement(
  userId: string,
): Promise<CoverLetterEntitlement> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      coverLetterQuota: true,
      coverLetterUsedThisPeriod: true,
      coverLetterQuotaResetAt: true,
    },
  })

  let used = user.coverLetterUsedThisPeriod
  let resetAt = user.coverLetterQuotaResetAt ?? nextResetDate()

  if (user.coverLetterQuotaResetAt && user.coverLetterQuotaResetAt.getTime() <= Date.now()) {
    used = 0
    resetAt = nextResetDate()
    await prisma.user.update({
      where: { id: userId },
      data: { coverLetterUsedThisPeriod: 0, coverLetterQuotaResetAt: resetAt },
    })
  } else if (!user.coverLetterQuotaResetAt) {
    await prisma.user.update({
      where: { id: userId },
      data: { coverLetterQuotaResetAt: resetAt },
    })
  }

  const quota = user.coverLetterQuota
  const remaining = quota === null ? null : Math.max(0, quota - used)
  return { allowed: quota === null || used < quota, quota, used, remaining, resetAt }
}

/** Konsumsi 1 kuota — dipanggil TEPAT sebelum surat benar-benar dibuat lewat AI. */
export async function consumeCoverLetterQuota(userId: string): Promise<void> {
  const entitlement = await checkCoverLetterEntitlement(userId)
  if (!entitlement.allowed) throw coverLetterQuotaExceeded()
  await prisma.user.update({
    where: { id: userId },
    data: { coverLetterUsedThisPeriod: { increment: 1 } },
  })
}

/** Kembalikan kuota bila generate gagal setelah kuota terlanjur dipotong. */
export async function refundCoverLetterQuota(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { coverLetterUsedThisPeriod: { decrement: 1 } },
  })
}

export { DEFAULT_COVER_LETTER_QUOTA }
