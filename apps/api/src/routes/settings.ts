import { Router } from "express"
import { prisma } from "@dilirik/db"
import { z } from "zod"
import { requireAuth } from "../middleware/requireAuth"
import { checkEntitlement } from "../services/quota"

export const settingsRouter: Router = Router()
settingsRouter.use(requireAuth)

// Profil + akun terhubung + kuota (PRD /app/settings)
settingsRouter.get("/", async (req, res, next) => {
  try {
    const [user, accounts, entitlement] = await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: { id: req.userId! },
        select: { id: true, name: true, email: true, image: true, plan: true, uiLanguage: true, createdAt: true },
      }),
      prisma.account.findMany({
        where: { userId: req.userId! },
        select: { providerId: true, createdAt: true },
      }),
      checkEntitlement(req.userId!),
    ])
    res.json({
      user,
      connectedAccounts: accounts.map((a) => a.providerId),
      quota: { quota: entitlement.quota, used: entitlement.used, remaining: entitlement.remaining, resetAt: entitlement.resetAt.toISOString() },
    })
  } catch (e) { next(e) }
})

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  uiLanguage: z.enum(["id", "en"]).optional(),
})
settingsRouter.patch("/", async (req, res, next) => {
  try {
    const input = updateSchema.parse(req.body)
    const user = await prisma.user.update({
      where: { id: req.userId! },
      data: input,
      select: { id: true, name: true, uiLanguage: true },
    })
    res.json({ user })
  } catch (e) { next(e) }
})
