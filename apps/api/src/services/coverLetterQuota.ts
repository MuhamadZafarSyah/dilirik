import { prisma } from "@dilirik/db"
import { DEFAULT_COVER_LETTER_QUOTA } from "@dilirik/shared"
import { HttpError } from "../middleware/errorHandler.js"

export type CoverLetterEntitlement = {
  allowed: boolean
  quota: number | null // null = unlimited
  used: number
  remaining: number | null
  resetAt: Date
}

export const coverLetterQuotaExceeded = () =>
  new HttpError(
    429,
    "COVER_LETTER_QUOTA_EXCEEDED",
    "Kuota pembuatan surat lamaran gratis bulan ini telah habis",
  )

function nextResetDate(from = new Date()): Date {
  return new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1))
}

export async function checkCoverLetterEntitlement(userId: string): Promise<CoverLetterEntitlement> {
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

  // Periode lewat → reset pemakaian
  if (user.coverLetterQuotaResetAt && user.coverLetterQuotaResetAt.getTime() <= Date.now()) {
    used = 0
    resetAt = nextResetDate()
    await prisma.user.update({
      where: { id: userId },
      data: { coverLetterUsedThisPeriod: 0, coverLetterQuotaResetAt: resetAt },
    })
  } else if (!user.coverLetterQuotaResetAt) {
    await prisma.user.update({ where: { id: userId }, data: { coverLetterQuotaResetAt: resetAt } })
  }

  const quota = user.coverLetterQuota // null = unlimited
  const remaining = quota === null ? null : Math.max(0, quota - used)
  return { allowed: quota === null || used < quota, quota, used, remaining, resetAt }
}

export async function consumeCoverLetterQuota(userId: string): Promise<void> {
  const entitlement = await checkCoverLetterEntitlement(userId)
  if (!entitlement.allowed) throw coverLetterQuotaExceeded()
  await prisma.user.update({
    where: { id: userId },
    data: { coverLetterUsedThisPeriod: { increment: 1 } },
  })
}

export { DEFAULT_COVER_LETTER_QUOTA }
