import { fetchJson, stripHtml } from "./http.js"
import type { JobProvider, JobQuery, RawJob } from "./types.js"

/**
 * Provider agregator (PRD Cari Lowongan §7.3).
 *
 * Aturan yang tidak boleh dilanggar di file ini:
 * 1. Env kosong → `isEnabled()` false. TIDAK throw. Fitur lain di aplikasi tidak
 *    boleh mati hanya karena satu key lowongan belum diisi.
 * 2. Semua provider berbayar punya `dailyCallBudget`. Yang menjaga tagihan tetap
 *    nol bukan niat baik, tapi angka yang dicek sebelum call dilakukan.
 * 3. JSearch default MATI di produksi — kuota gratisnya (200 request/bulan)
 *    hanya cukup untuk benchmark cakupan, bukan untuk melayani user.
 */

const JOOBLE_BASE = "https://jooble.org/api"
const ADZUNA_BASE = "https://api.adzuna.com/v1/api/jobs"
const JSEARCH_BASE = "https://jsearch.p.rapidapi.com/search"
const JSEARCH_HOST = "jsearch.p.rapidapi.com"

function envValue(name: string): string {
  return (process.env[name] ?? "").trim()
}

function envNumber(name: string, fallback: number): number {
  const parsed = Number.parseInt(envValue(name), 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

function str(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value)
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace(/[^0-9.]/g, ""))
    return Number.isFinite(parsed) ? Math.round(parsed) : null
  }
  return null
}

function iso(value: unknown): string | null {
  const raw = typeof value === "string" ? value.trim() : ""
  if (!raw) return null
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

/* ===================== Jooble ===================== */
// POST <base>/<api_key> — kandidat terkuat untuk cakupan Indonesia.
export const joobleProvider: JobProvider = {
  id: "jooble",
  displayName: "Jooble",
  kind: "aggregator",
  costPerCall: 0,
  get dailyCallBudget() {
    return envNumber("DISCOVERY_JOOBLE_DAILY_BUDGET", 200)
  },
  isEnabled() {
    return envValue("JOOBLE_API_KEY").length > 0
  },
  async search(query: JobQuery): Promise<RawJob[]> {
    const key = envValue("JOOBLE_API_KEY")
    if (!key) return []
    const data = await fetchJson<{ jobs?: unknown }>(
      `${JOOBLE_BASE}/${encodeURIComponent(key)}`,
      {
        method: "POST",
        body: {
          keywords: query.keywords.join(" "),
          location: query.location ?? "",
          page: String(query.page ?? 1),
        },
      },
    )
    return asArray(data.jobs).flatMap((entry) => {
      const job = entry as Record<string, unknown>
      const title = str(job.title)
      const link = str(job.link)
      if (!title || !link) return []
      const company = str(job.company) ?? "Perusahaan tidak disebutkan"
      const publisher = str(job.source)
      return [
        {
          providerId: "jooble",
          sourceDisplayName: publisher ? `${publisher} (via Jooble)` : "Jooble",
          externalId: `jooble:${str(job.id) ?? link}`,
          title,
          company,
          location: str(job.location),
          description: stripHtml(str(job.snippet)),
          postedAt: iso(job.updated),
          applyUrl: link,
          sourceUrl: link,
        } satisfies RawJob,
      ]
    })
  },
}

/* ===================== Adzuna ===================== */
// GET <base>/<country>/search/<page>?app_id=..&app_key=..
export const adzunaProvider: JobProvider = {
  id: "adzuna",
  displayName: "Adzuna",
  kind: "aggregator",
  costPerCall: 1,
  get dailyCallBudget() {
    // ~1.000 call/bulan gratis → 30/hari menyisakan ruang untuk retry.
    return envNumber("DISCOVERY_ADZUNA_DAILY_BUDGET", 30)
  },
  isEnabled() {
    return envValue("ADZUNA_APP_ID").length > 0 && envValue("ADZUNA_APP_KEY").length > 0
  },
  async search(query: JobQuery): Promise<RawJob[]> {
    if (!adzunaProvider.isEnabled()) return []
    const country = envValue("ADZUNA_COUNTRY") || "id"
    const params = new URLSearchParams({
      app_id: envValue("ADZUNA_APP_ID"),
      app_key: envValue("ADZUNA_APP_KEY"),
      results_per_page: "50",
      what: query.keywords.join(" "),
      "content-type": "application/json",
    })
    if (query.location) params.set("where", query.location)
    if (query.postedWithinDays) params.set("max_days_old", String(query.postedWithinDays))

    const data = await fetchJson<{ results?: unknown }>(
      `${ADZUNA_BASE}/${encodeURIComponent(country)}/search/${query.page ?? 1}?${params.toString()}`,
    )
    return asArray(data.results).flatMap((entry) => {
      const job = entry as Record<string, unknown>
      const title = str(job.title)
      const redirect = str(job.redirect_url)
      if (!title || !redirect) return []
      const company =
        str((job.company as Record<string, unknown> | undefined)?.display_name) ??
        "Perusahaan tidak disebutkan"
      const location = str((job.location as Record<string, unknown> | undefined)?.display_name)
      const contractTime = str(job.contract_time)
      return [
        {
          providerId: "adzuna",
          sourceDisplayName: "Adzuna",
          externalId: `adzuna:${str(job.id) ?? redirect}`,
          title,
          company,
          location,
          description: stripHtml(str(job.description)),
          salaryMin: num(job.salary_min),
          salaryMax: num(job.salary_max),
          currency: null,
          salaryPeriod: contractTime === "part_time" ? "hour" : "year",
          postedAt: iso(job.created),
          applyUrl: redirect,
          sourceUrl: redirect,
        } satisfies RawJob,
      ]
    })
  },
}

/* ===================== JSearch (RapidAPI) ===================== */
// Default MATI. Dipakai hanya untuk mengukur cakupan indeks kita vs Google for Jobs.
export const jsearchProvider: JobProvider = {
  id: "jsearch",
  displayName: "JSearch (Google for Jobs)",
  kind: "aggregator",
  costPerCall: 1,
  get dailyCallBudget() {
    return envNumber("DISCOVERY_JSEARCH_DAILY_BUDGET", 0)
  },
  isEnabled() {
    return envValue("RAPIDAPI_KEY").length > 0 && envValue("DISCOVERY_JSEARCH_ENABLED") === "true"
  },
  async search(query: JobQuery): Promise<RawJob[]> {
    if (!jsearchProvider.isEnabled()) return []
    const params = new URLSearchParams({
      query: [query.keywords.join(" "), query.location ?? ""].filter(Boolean).join(" in "),
      page: String(query.page ?? 1),
      num_pages: "1",
    })
    if (query.remoteOnly) params.set("remote_jobs_only", "true")
    const data = await fetchJson<{ data?: unknown }>(`${JSEARCH_BASE}?${params.toString()}`, {
      headers: {
        "x-rapidapi-key": envValue("RAPIDAPI_KEY"),
        "x-rapidapi-host": JSEARCH_HOST,
      },
    })
    return asArray(data.data).flatMap((entry) => {
      const job = entry as Record<string, unknown>
      const title = str(job.job_title)
      const applyUrl = str(job.job_apply_link)
      if (!title || !applyUrl) return []
      const publisher = str(job.job_publisher)
      return [
        {
          providerId: "jsearch",
          sourceDisplayName: publisher ? `${publisher} (via Google for Jobs)` : "Google for Jobs",
          externalId: `jsearch:${str(job.job_id) ?? applyUrl}`,
          title,
          company: str(job.employer_name) ?? "Perusahaan tidak disebutkan",
          location:
            [str(job.job_city), str(job.job_state), str(job.job_country)]
              .filter(Boolean)
              .join(", ") || null,
          remoteType: job.job_is_remote === true ? "remote" : null,
          description: stripHtml(str(job.job_description)),
          salaryMin: num(job.job_min_salary),
          salaryMax: num(job.job_max_salary),
          currency: str(job.job_salary_currency),
          salaryPeriod: str(job.job_salary_period),
          postedAt: iso(job.job_posted_at_datetime_utc),
          applyUrl,
          sourceUrl: str(job.job_google_link) ?? applyUrl,
        } satisfies RawJob,
      ]
    })
  },
}

export const AGGREGATOR_PROVIDERS: JobProvider[] = [
  joobleProvider,
  adzunaProvider,
  jsearchProvider,
]

/** Provider yang benar-benar siap dipakai pada run ini. */
export function enabledAggregators(): JobProvider[] {
  return AGGREGATOR_PROVIDERS.filter((provider) => provider.isEnabled())
}

/** Provider yang mati karena env kosong — ditampilkan sebagai "sumber tidak tersedia". */
export function disabledAggregators(): JobProvider[] {
  return AGGREGATOR_PROVIDERS.filter((provider) => !provider.isEnabled())
}
