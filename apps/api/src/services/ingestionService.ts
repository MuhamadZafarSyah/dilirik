import { prisma } from "@dilirik/db"
import {
  CURATED_COMPANIES_SEED,
  collectJobs,
  defaultAggregatorQueries,
  type CompanyOutcome,
  type MergedJob,
} from "@dilirik/jobs"
import {
  DISCOVERY_ATS_FAIL_LIMIT,
  DISCOVERY_INDEX_RETENTION_DAYS,
  DISCOVERY_STALE_DAYS,
} from "@dilirik/shared"

/**
 * Ingestion terjadwal (PRD Cari Lowongan §8.3).
 *
 * Keputusan arsitektur terpenting di fitur ini: pencarian user TIDAK memanggil
 * sumber eksternal. Cron mengisi indeks lokal, pencarian membaca indeks. Kalau
 * dibalik — fan-out live per request — biaya dan latensi naik sebanding jumlah
 * user, dan kuota gratis provider habis dalam hitungan hari.
 *
 * Konsekuensi jujur dari pilihan ini: data bisa tertinggal beberapa jam. Karena
 * itu setiap kartu hasil WAJIB menampilkan "diposting X jam lalu" dan "diindeks
 * X jam lalu" — kesegaran tidak diklaim, tapi ditunjukkan.
 */

const MS_PER_DAY = 86_400_000

export type IngestionOptions = {
  trigger?: "cron" | "manual"
  maxCompanies?: number
  maxAggregatorQueries?: number
  dryRun?: boolean
}

export type IngestionSummary = {
  runId: string | null
  status: "DONE" | "PARTIAL" | "FAILED"
  companiesFetched: number
  rawCount: number
  upsertedCount: number
  newCount: number
  expiredCount: number
  unavailableSources: string[]
  dryRun: boolean
}

/** Sinkronkan seed daftar kurasi. Idempoten — aman dipanggil setiap run. */
export async function ensureCuratedCompanies(): Promise<number> {
  let created = 0
  for (const company of CURATED_COMPANIES_SEED) {
    const result = await prisma.curatedCompany.upsert({
      where: {
        atsProvider_atsSlug: {
          atsProvider: company.atsProvider,
          atsSlug: company.atsSlug,
        },
      },
      create: {
        name: company.name,
        atsProvider: company.atsProvider,
        atsSlug: company.atsSlug,
        region: company.region,
      },
      update: { name: company.name, region: company.region },
      select: { createdAt: true, updatedAt: true },
    })
    if (result.createdAt.getTime() === result.updatedAt.getTime()) created++
  }
  return created
}

function expiryFor(job: MergedJob): Date {
  const base = job.validThrough ? new Date(job.validThrough) : null
  if (base && !Number.isNaN(base.getTime())) return base
  return new Date(Date.now() + DISCOVERY_INDEX_RETENTION_DAYS * MS_PER_DAY)
}

function isLikelyStale(postedAt: string | null | undefined): boolean {
  if (!postedAt) return false
  const posted = new Date(postedAt).getTime()
  if (Number.isNaN(posted)) return false
  return Date.now() - posted > DISCOVERY_STALE_DAYS * MS_PER_DAY
}

async function upsertJobs(jobs: MergedJob[]): Promise<{ upserted: number; created: number }> {
  let upserted = 0
  let created = 0

  for (const job of jobs) {
    const postedAt = job.postedAt ? new Date(job.postedAt) : null
    const data = {
      title: job.title,
      titleNorm: job.titleNorm,
      company: job.company,
      companyNorm: job.companyNorm,
      location: job.location ?? null,
      locationNorm: job.locationNorm ?? null,
      city: job.city ?? null,
      remoteType: job.remoteType ?? null,
      descriptionSnippet: job.descriptionSnippet,
      skillTermsJson: job.skillTerms,
      salaryMin: job.salaryMin ?? null,
      salaryMax: job.salaryMax ?? null,
      currency: job.currency ?? null,
      salaryPeriod: job.salaryPeriod ?? null,
      sourcesJson: job.sources,
      primarySource: job.primarySource,
      applyUrl: job.applyUrl,
      sourceUrl: job.sourceUrl,
      postedAt: postedAt && !Number.isNaN(postedAt.getTime()) ? postedAt : null,
      validThrough: job.validThrough ? new Date(job.validThrough) : null,
      lastSeenAt: new Date(),
      expiresAt: expiryFor(job),
      isLikelyStale: isLikelyStale(job.postedAt),
    }

    const existing = await prisma.discoveredJob.findUnique({
      where: { fingerprint: job.fingerprint },
      select: { id: true },
    })

    await prisma.discoveredJob.upsert({
      where: { fingerprint: job.fingerprint },
      create: { fingerprint: job.fingerprint, ...data },
      update: data,
    })

    upserted++
    if (!existing) created++
  }

  return { upserted, created }
}

/**
 * failCount naik saat board perusahaan gagal ditarik dan nol lagi begitu berhasil.
 * Slug yang mati permanen (perusahaan pindah ATS, board ditutup) akhirnya
 * menonaktifkan dirinya sendiri — daftar kurasi tidak perlu dirawat manual
 * untuk tetap sehat.
 */
async function recordCompanyOutcomes(outcomes: CompanyOutcome[]): Promise<void> {
  for (const outcome of outcomes) {
    const where = {
      atsProvider_atsSlug: {
        atsProvider: outcome.company.atsProvider,
        atsSlug: outcome.company.atsSlug,
      },
    }

    if (outcome.ok) {
      await prisma.curatedCompany.update({
        where,
        data: {
          failCount: 0,
          lastErrorMsg: null,
          lastFetchedAt: new Date(),
          lastJobCount: outcome.jobCount,
        },
      })
      continue
    }

    const company = await prisma.curatedCompany.update({
      where,
      data: {
        failCount: { increment: 1 },
        lastErrorMsg: outcome.errorMsg?.slice(0, 500) ?? "gagal tanpa pesan",
        lastFetchedAt: new Date(),
      },
      select: { id: true, failCount: true },
    })

    if (company.failCount >= DISCOVERY_ATS_FAIL_LIMIT) {
      await prisma.curatedCompany.update({
        where: { id: company.id },
        data: { isActive: false },
      })
    }
  }
}

export async function runIngestion(options: IngestionOptions = {}): Promise<IngestionSummary> {
  const trigger = options.trigger ?? "cron"
  const dryRun = options.dryRun ?? false

  await ensureCuratedCompanies()

  const companies = await prisma.curatedCompany.findMany({
    where: { isActive: true },
    orderBy: { lastFetchedAt: "asc" },
    take: options.maxCompanies ?? 400,
    select: { name: true, atsProvider: true, atsSlug: true },
  })

  const run = dryRun
    ? null
    : await prisma.ingestionRun.create({
        data: { status: "RUNNING", trigger },
        select: { id: true },
      })

  try {
    const collected = await collectJobs({
      companies,
      aggregatorQueries: defaultAggregatorQueries(),
      maxAggregatorQueries: options.maxAggregatorQueries,
    })

    if (dryRun) {
      return {
        runId: null,
        status: "DONE",
        companiesFetched: companies.length,
        rawCount: collected.rawCount,
        upsertedCount: 0,
        newCount: 0,
        expiredCount: 0,
        unavailableSources: collected.unavailableSources,
        dryRun: true,
      }
    }

    const { upserted, created } = await upsertJobs(collected.jobs)
    await recordCompanyOutcomes(collected.companyOutcomes)

    // Purge baris kedaluwarsa: indeks tidak boleh tumbuh tanpa batas, dan
    // lowongan basi lebih berbahaya daripada indeks yang lebih kecil.
    const purged = await prisma.discoveredJob.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    })

    const hasProblem = collected.providerRuns.some((providerRun) => providerRun.status === "ERROR")
    const status = hasProblem ? "PARTIAL" : "DONE"

    await prisma.ingestionRun.update({
      where: { id: run!.id },
      data: {
        status,
        providerStatsJson: collected.providerRuns.map((providerRun) => ({
          providerId: providerRun.providerId,
          status: providerRun.status,
          calls: providerRun.calls,
          errorMsg: providerRun.errorMsg ?? null,
        })),
        companiesFetched: companies.length,
        rawCount: collected.rawCount,
        upsertedCount: upserted,
        newCount: created,
        expiredCount: purged.count,
        finishedAt: new Date(),
      },
    })

    return {
      runId: run!.id,
      status,
      companiesFetched: companies.length,
      rawCount: collected.rawCount,
      upsertedCount: upserted,
      newCount: created,
      expiredCount: purged.count,
      unavailableSources: collected.unavailableSources,
      dryRun: false,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (run) {
      await prisma.ingestionRun.update({
        where: { id: run.id },
        data: { status: "FAILED", errorMsg: message.slice(0, 1000), finishedAt: new Date() },
      })
    }
    throw error
  }
}

/** Umur indeks dalam jam — dipakai untuk transparansi kesegaran data di UI. */
export async function getIndexAgeHours(): Promise<number | null> {
  const latest = await prisma.discoveredJob.findFirst({
    orderBy: { indexedAt: "desc" },
    select: { indexedAt: true },
  })
  if (!latest) return null
  return Math.max(0, Math.round((Date.now() - latest.indexedAt.getTime()) / 3_600_000))
}
