import { dedupeJobs, type MergedJob } from "./dedupe.js"
import { normalizeJob, type NormalizedJob } from "./normalize.js"
import { disabledAggregators, enabledAggregators } from "./providers/aggregators.js"
import { ATS_CONNECTORS, getAtsConnector } from "./providers/ats.js"
import type { AtsCompanyRef, JobQuery, ProviderRunResult, RawJob } from "./providers/types.js"

/**
 * Orkestrasi ingestion (PRD Cari Lowongan §8.2).
 *
 * Paket ini SENGAJA tidak mengenal Prisma. `collectJobs` hanya mengembalikan
 * lowongan yang sudah dinormalisasi + statistik per provider; yang menyimpan ke
 * database adalah `ingestionService` di apps/api. Batas ini yang membuat provider
 * bisa diuji tanpa database dan tanpa jaringan.
 *
 * Prinsip yang dijaga: SATU sumber gagal tidak boleh menggagalkan run. Setiap
 * error dikumpulkan, bukan dilempar ke atas.
 */

export type CollectJobsInput = {
  /** Perusahaan pada daftar kurasi yang akan ditarik dari ATS-nya. */
  companies: AtsCompanyRef[]
  /** Query kata kunci untuk agregator. Kosong = agregator dilewati. */
  aggregatorQueries?: JobQuery[]
  maxCompanies?: number
  maxAggregatorQueries?: number
  concurrency?: number
}

export type CompanyOutcome = {
  company: AtsCompanyRef
  ok: boolean
  jobCount: number
  errorMsg?: string
}

export type CollectJobsResult = {
  jobs: MergedJob[]
  providerRuns: ProviderRunResult[]
  companyOutcomes: CompanyOutcome[]
  /** Sumber yang tidak bisa dipakai run ini — wajib ditampilkan ke user. */
  unavailableSources: string[]
  rawCount: number
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = []
  let cursor = 0
  const runners = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (cursor < items.length) {
      const index = cursor++
      results[index] = await worker(items[index]!)
    }
  })
  await Promise.all(runners)
  return results
}

/**
 * Seed query agregator: kombinasi peran × kota yang paling sering dicari user
 * Indonesia. Dibatasi ketat karena tiap query memakan kuota harian Adzuna.
 */
export function defaultAggregatorQueries(postedWithinDays = 7): JobQuery[] {
  const roles = [
    "frontend developer",
    "backend developer",
    "fullstack developer",
    "mobile developer",
    "data analyst",
    "product manager",
    "ui ux designer",
    "digital marketing",
    "customer success",
    "finance accounting",
  ]
  const cities = ["Jakarta", "Bandung", "Surabaya"]
  const queries: JobQuery[] = []
  for (const role of roles) {
    for (const city of cities) {
      queries.push({ keywords: [role], location: city, postedWithinDays })
    }
    queries.push({ keywords: [role], location: null, remoteOnly: true, postedWithinDays })
  }
  return queries
}

async function collectFromAts(
  companies: AtsCompanyRef[],
  concurrency: number,
): Promise<{ jobs: RawJob[]; outcomes: CompanyOutcome[]; runs: ProviderRunResult[] }> {
  const outcomes = await mapWithConcurrency(companies, concurrency, async (company) => {
    const connector = getAtsConnector(company.atsProvider)
    if (!connector) {
      return {
        company,
        ok: false,
        jobCount: 0,
        errorMsg: `ATS tidak dikenali: ${company.atsProvider}`,
        jobs: [] as RawJob[],
      }
    }
    try {
      const jobs = await connector.fetchJobs(company)
      return { company, ok: true, jobCount: jobs.length, jobs }
    } catch (error) {
      return {
        company,
        ok: false,
        jobCount: 0,
        errorMsg: error instanceof Error ? error.message : String(error),
        jobs: [] as RawJob[],
      }
    }
  })

  const jobs = outcomes.flatMap((outcome) => outcome.jobs)
  const runs: ProviderRunResult[] = Object.keys(ATS_CONNECTORS).map((provider) => {
    const scoped = outcomes.filter((outcome) => outcome.company.atsProvider === provider)
    const failures = scoped.filter((outcome) => !outcome.ok)
    return {
      providerId: `ats:${provider}`,
      status: scoped.length === 0 ? "DISABLED" : failures.length === scoped.length ? "ERROR" : "OK",
      calls: scoped.length,
      jobs: [],
      errorMsg: failures.length > 0 ? `${failures.length} perusahaan gagal ditarik` : undefined,
    }
  })

  return {
    jobs,
    outcomes: outcomes.map(({ company, ok, jobCount, errorMsg }) => ({
      company,
      ok,
      jobCount,
      errorMsg,
    })),
    runs,
  }
}

async function collectFromAggregators(
  queries: JobQuery[],
): Promise<{ jobs: RawJob[]; runs: ProviderRunResult[] }> {
  const jobs: RawJob[] = []
  const runs: ProviderRunResult[] = []

  for (const provider of enabledAggregators()) {
    const budget = provider.dailyCallBudget
    const allowed = budget > 0 ? queries.slice(0, budget) : queries
    let calls = 0
    let errorMsg: string | undefined

    for (const query of allowed) {
      try {
        const result = await provider.search(query)
        calls++
        jobs.push(...result)
      } catch (error) {
        calls++
        errorMsg = error instanceof Error ? error.message : String(error)
        // Provider gratis sering rate-limit di tengah run; sisa query dibatalkan
        // agar tidak membakar kuota untuk error yang sama.
        break
      }
    }

    runs.push({
      providerId: provider.id,
      status: errorMsg
        ? "ERROR"
        : budget > 0 && queries.length > budget
          ? "BUDGET_EXHAUSTED"
          : "OK",
      calls,
      jobs: [],
      errorMsg,
    })
  }

  for (const provider of disabledAggregators()) {
    runs.push({ providerId: provider.id, status: "DISABLED", calls: 0, jobs: [] })
  }

  return { jobs, runs }
}

export async function collectJobs(input: CollectJobsInput): Promise<CollectJobsResult> {
  const companies = input.companies.slice(0, input.maxCompanies ?? input.companies.length)
  const queries = (input.aggregatorQueries ?? []).slice(
    0,
    input.maxAggregatorQueries ?? (input.aggregatorQueries ?? []).length,
  )

  const [ats, aggregated] = await Promise.all([
    collectFromAts(companies, input.concurrency ?? 6),
    collectFromAggregators(queries),
  ])

  const raw = [...ats.jobs, ...aggregated.jobs]
  const normalized: NormalizedJob[] = raw.map((job) => normalizeJob(job))
  const providerRuns = [...ats.runs, ...aggregated.runs]

  return {
    jobs: dedupeJobs(normalized),
    providerRuns,
    companyOutcomes: ats.outcomes,
    unavailableSources: providerRuns
      .filter((run) => run.status === "DISABLED" || run.status === "ERROR")
      .map((run) => run.providerId),
    rawCount: raw.length,
  }
}
