import { prisma } from "@dilirik/db"
import { APPLICATION_STATUSES, type ApplicationStatus, type Gap } from "@dilirik/shared"
import { checkEntitlement } from "./quota"

/** Ringkasan dashboard (PRD §7.6). */
export async function getDashboard(userId: string) {
  const [byStatus, avgScore, recentAnalyses, cvCount, jobCount, entitlement] = await Promise.all([
    prisma.application.groupBy({ by: ["status"], where: { userId }, _count: { _all: true } }),
    prisma.analysis.aggregate({ where: { userId }, _avg: { matchScore: true } }),
    prisma.analysis.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, matchScore: true, gapsJson: true, createdAt: true, cv: { select: { title: true } } },
    }),
    prisma.cv.count({ where: { userId } }),
    prisma.jobPosting.count({ where: { userId } }),
    checkEntitlement(userId),
  ])

  const pipeline = Object.fromEntries(APPLICATION_STATUSES.map((s) => [s, 0])) as Record<
    ApplicationStatus,
    number
  >
  for (const row of byStatus) pipeline[row.status as ApplicationStatus] = row._count._all

  // Gap yang paling sering muncul di 10 analisis terakhir
  const gapCounts = new Map<string, number>()
  for (const analysis of recentAnalyses) {
    const gaps = (analysis.gapsJson as Gap[] | null) ?? []
    for (const gap of gaps) {
      const key = gap.skill.toLowerCase()
      gapCounts.set(key, (gapCounts.get(key) ?? 0) + 1)
    }
  }
  const topGaps = [...gapCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([skill, count]) => ({ skill, count }))

  return {
    pipeline,
    averageScore: avgScore._avg.matchScore ? Math.round(avgScore._avg.matchScore) : null,
    topGaps,
    counts: { cvs: cvCount, jobs: jobCount },
    quota: {
      quota: entitlement.quota,
      used: entitlement.used,
      remaining: entitlement.remaining,
      resetAt: entitlement.resetAt.toISOString(),
    },
    recentAnalyses: recentAnalyses.map((a) => ({
      id: a.id,
      matchScore: a.matchScore,
      cvTitle: a.cv.title,
      createdAt: a.createdAt.toISOString(),
    })),
  }
}
