import { prisma } from "@dilirik/db"
import { DEFAULT_DISCOVERY_QUOTA } from "@dilirik/shared"
import { HttpError } from "../middleware/errorHandler.js"

/**
 * Kuota pencarian lowongan (PRD Cari Lowongan §13.1).
 *
 * Mengikuti pola kuota yang sudah ada (analisis, interview, surat lamaran) supaya
 * perilaku reset bulanan konsisten di seluruh aplikasi.
 *
 * Yang TIDAK memakan kuota, dan itu disengaja: melihat riwayat run, menyunting
 * profil pencarian, menyimpan/menyembunyikan hasil, dan meminta notifikasi.
 * Kuota hanya jatuh saat pencarian baru benar-benar dieksekusi.
 */

export type DiscoveryEntitlement = {
  allowed: boolean
  quota: number | null // null = unlimited
  used: number
  remaining: number | null
  resetAt: Date
}

export const discoveryQuotaExceeded = () =>
  new HttpError(
    429,
    "DISCOVERY_QUOTA_EXCEEDED",
    "Kuota pencarian lowongan gratis bulan ini telah habis",
  )

function nextResetDate(from = new Date()): Date {
  return new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1))
}

export async function checkDiscoveryEntitlement(userId: string): Promise<DiscoveryEntitlement> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      discoveryQuota: true,
      discoveryUsedThisPeriod: true,
      discoveryQuotaResetAt: true,
    },
  })

  let used = user.discoveryUsedThisPeriod
  let resetAt = user.discoveryQuotaResetAt ?? nextResetDate()

  // Periode lewat → reset pemakaian
  if (user.discoveryQuotaResetAt && user.discoveryQuotaResetAt.getTime() <= Date.now()) {
    used = 0
    resetAt = nextResetDate()
    await prisma.user.update({
      where: { id: userId },
      data: { discoveryUsedThisPeriod: 0, discoveryQuotaResetAt: resetAt },
    })
  } else if (!user.discoveryQuotaResetAt) {
    await prisma.user.update({ where: { id: userId }, data: { discoveryQuotaResetAt: resetAt } })
  }

  const quota = user.discoveryQuota // null = unlimited
  const remaining = quota === null ? null : Math.max(0, quota - used)
  return { allowed: quota === null || used < quota, quota, used, remaining, resetAt }
}

export async function consumeDiscoveryQuota(userId: string): Promise<void> {
  const entitlement = await checkDiscoveryEntitlement(userId)
  if (!entitlement.allowed) throw discoveryQuotaExceeded()
  await prisma.user.update({
    where: { id: userId },
    data: { discoveryUsedThisPeriod: { increment: 1 } },
  })
}

export { DEFAULT_DISCOVERY_QUOTA }
