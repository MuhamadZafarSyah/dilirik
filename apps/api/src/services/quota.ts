import { prisma } from "@dilirik/db"
import { DEFAULT_ANALYSIS_QUOTA } from "@dilirik/shared"
import { quotaExceeded } from "../middleware/errorHandler"

export type Entitlement = {
  allowed: boolean
  quota: number | null // null = unlimited
  used: number
  remaining: number | null
  resetAt: Date
}

function nextResetDate(from = new Date()): Date {
  return new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1))
}

/**
 * checkEntitlement (PRD §14): kuota via flag `analysisQuota`
 * — null = unlimited, angka berapa pun bisa di-set per user (beta/promo/Pro).
 * Reset otomatis tiap awal bulan (quotaResetAt).
 */
export async function checkEntitlement(userId: string): Promise<Entitlement> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { analysisQuota: true, analysisUsedThisPeriod: true, quotaResetAt: true },
  })

  let used = user.analysisUsedThisPeriod
  let resetAt = user.quotaResetAt ?? nextResetDate()

  // Periode lewat → reset pemakaian
  if (user.quotaResetAt && user.quotaResetAt.getTime() <= Date.now()) {
    used = 0
    resetAt = nextResetDate()
    await prisma.user.update({
      where: { id: userId },
      data: { analysisUsedThisPeriod: 0, quotaResetAt: resetAt },
    })
  } else if (!user.quotaResetAt) {
    await prisma.user.update({ where: { id: userId }, data: { quotaResetAt: resetAt } })
  }

  const quota = user.analysisQuota // null = unlimited
  const remaining = quota === null ? null : Math.max(0, quota - used)
  return { allowed: quota === null || used < quota, quota, used, remaining, resetAt }
}

/** Konsumsi 1 kuota — dipanggil HANYA saat analisis benar-benar memanggil AI (cache hit gratis). */
export async function consumeQuota(userId: string): Promise<void> {
  const entitlement = await checkEntitlement(userId)
  if (!entitlement.allowed) throw quotaExceeded()
  await prisma.user.update({
    where: { id: userId },
    data: { analysisUsedThisPeriod: { increment: 1 } },
  })
}

export { DEFAULT_ANALYSIS_QUOTA }
