import { prisma } from "@dilirik/db"
import { DEFAULT_INTERVIEW_QUOTA } from "@dilirik/shared"
import { HttpError } from "../middleware/errorHandler"

export type InterviewEntitlement = {
  allowed: boolean
  quota: number | null // null = unlimited
  used: number
  remaining: number | null
  resetAt: Date
}

export const interviewQuotaExceeded = () =>
  new HttpError(429, "INTERVIEW_QUOTA_EXCEEDED", "Kuota latihan interview bulan ini habis")

function nextResetDate(from = new Date()): Date {
  return new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1))
}

/**
 * Pola sama persis dengan kuota analisis (services/quota.ts):
 * `interviewQuota` null = unlimited, angka bisa di-set per user (beta/promo/Pro).
 * Reset otomatis tiap awal bulan (interviewQuotaResetAt).
 */
export async function checkInterviewEntitlement(userId: string): Promise<InterviewEntitlement> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { interviewQuota: true, interviewUsedThisPeriod: true, interviewQuotaResetAt: true },
  })

  let used = user.interviewUsedThisPeriod
  let resetAt = user.interviewQuotaResetAt ?? nextResetDate()

  // Periode lewat → reset pemakaian
  if (user.interviewQuotaResetAt && user.interviewQuotaResetAt.getTime() <= Date.now()) {
    used = 0
    resetAt = nextResetDate()
    await prisma.user.update({
      where: { id: userId },
      data: { interviewUsedThisPeriod: 0, interviewQuotaResetAt: resetAt },
    })
  } else if (!user.interviewQuotaResetAt) {
    await prisma.user.update({ where: { id: userId }, data: { interviewQuotaResetAt: resetAt } })
  }

  const quota = user.interviewQuota // null = unlimited
  const remaining = quota === null ? null : Math.max(0, quota - used)
  return { allowed: quota === null || used < quota, quota, used, remaining, resetAt }
}

/** Konsumsi 1 kuota — dipotong saat SESI DIBUAT (bukan saat feedback), PRD §7.7. */
export async function consumeInterviewQuota(userId: string): Promise<void> {
  const entitlement = await checkInterviewEntitlement(userId)
  if (!entitlement.allowed) throw interviewQuotaExceeded()
  await prisma.user.update({
    where: { id: userId },
    data: { interviewUsedThisPeriod: { increment: 1 } },
  })
}

export { DEFAULT_INTERVIEW_QUOTA }
