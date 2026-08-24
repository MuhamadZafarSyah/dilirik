import { fetchJson, stripHtml } from "./http.js"
import type { AtsCompanyRef, AtsConnector, RawJob, RemoteType } from "./types.js"

/**
 * Konektor ATS publik (PRD Cari Lowongan §7.2).
 *
 * Kelima endpoint di bawah TIDAK butuh API key dan tidak punya kuota. Itu alasan
 * ATS dijadikan tulang belakang volume indeks, bukan pelengkap: biaya nol,
 * datanya paling terstruktur, dan lowongannya datang langsung dari halaman
 * karier resmi perusahaan — sumber paling kredibel yang bisa kita tampilkan.
 *
 * Semua parser di sini SENGAJA defensif. Job board publik boleh berubah bentuk
 * kapan saja tanpa memberi tahu siapa pun; satu field hilang tidak boleh
 * menjatuhkan seluruh ingestion run.
 */

const GREENHOUSE_BASE = "https://boards-api.greenhouse.io/v1/boards"
const LEVER_BASE = "https://api.lever.co/v0/postings"
const ASHBY_BASE = "https://api.ashbyhq.com/posting-api/job-board"
const WORKABLE_BASE = "https://apply.workable.com/api/v1/widget/accounts"
const RECRUITEE_HOST_SUFFIX = ".recruitee.com/api/offers/"

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function str(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function iso(value: unknown): string | null {
  if (typeof value === "number") {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
  }
  const raw = typeof value === "string" ? value.trim() : ""
  if (!raw) return null
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function remoteFrom(flag: unknown, text: string | null): RemoteType | null {
  if (flag === true) return "remote"
  const value = `${typeof flag === "string" ? flag : ""} ${text ?? ""}`.toLowerCase().trim()
  if (!value) return null
  if (value.includes("hybrid")) return "hybrid"
  if (value.includes("remote") || value.includes("anywhere")) return "remote"
  if (value.includes("onsite") || value.includes("on-site") || value.includes("in office")) {
    return "onsite"
  }
  return null
}

/* ===================== Greenhouse ===================== */
// GET <base>/<board_token>/jobs?content=true
const greenhouse: AtsConnector = {
  id: "greenhouse",
  displayName: (company) => `Halaman karier ${company} (Greenhouse)`,
  async fetchJobs(company: AtsCompanyRef): Promise<RawJob[]> {
    const slug = encodeURIComponent(company.atsSlug)
    const data = await fetchJson<{ jobs?: unknown }>(
      `${GREENHOUSE_BASE}/${slug}/jobs?content=true`,
    )
    return asArray(data.jobs).flatMap((entry) => {
      const job = entry as Record<string, unknown>
      const id = str(job.id)
      const title = str(job.title)
      const applyUrl = str(job.absolute_url)
      if (!id || !title || !applyUrl) return []
      const location = str((job.location as Record<string, unknown> | undefined)?.name)
      return [
        {
          providerId: "ats:greenhouse",
          sourceDisplayName: greenhouse.displayName(company.name),
          externalId: `greenhouse:${company.atsSlug}:${id}`,
          title,
          company: company.name,
          location,
          remoteType: remoteFrom(null, location),
          description: stripHtml(str(job.content)),
          postedAt: iso(job.first_published ?? job.updated_at),
          applyUrl,
          sourceUrl: applyUrl,
        } satisfies RawJob,
      ]
    })
  },
}

/* ===================== Lever ===================== */
// GET <base>/<site>?mode=json
const lever: AtsConnector = {
  id: "lever",
  displayName: (company) => `Halaman karier ${company} (Lever)`,
  async fetchJobs(company: AtsCompanyRef): Promise<RawJob[]> {
    const slug = encodeURIComponent(company.atsSlug)
    const data = await fetchJson<unknown>(`${LEVER_BASE}/${slug}?mode=json`)
    return asArray(data).flatMap((entry) => {
      const job = entry as Record<string, unknown>
      const categories = (job.categories as Record<string, unknown> | undefined) ?? {}
      const salary = (job.salaryRange as Record<string, unknown> | undefined) ?? {}
      const id = str(job.id)
      const title = str(job.text)
      const hostedUrl = str(job.hostedUrl)
      if (!id || !title || !hostedUrl) return []
      const location = str(categories.location)
      return [
        {
          providerId: "ats:lever",
          sourceDisplayName: lever.displayName(company.name),
          externalId: `lever:${company.atsSlug}:${id}`,
          title,
          company: company.name,
          location,
          remoteType: remoteFrom(job.workplaceType, location),
          description: stripHtml(str(job.descriptionPlain) ?? str(job.description)),
          salaryMin: num(salary.min),
          salaryMax: num(salary.max),
          currency: str(salary.currency),
          salaryPeriod: str(salary.interval),
          postedAt: iso(job.createdAt),
          applyUrl: str(job.applyUrl) ?? hostedUrl,
          sourceUrl: hostedUrl,
        } satisfies RawJob,
      ]
    })
  },
}

/* ===================== Ashby ===================== */
// GET <base>/<board_name>?includeCompensation=true
const ashby: AtsConnector = {
  id: "ashby",
  displayName: (company) => `Halaman karier ${company} (Ashby)`,
  async fetchJobs(company: AtsCompanyRef): Promise<RawJob[]> {
    const slug = encodeURIComponent(company.atsSlug)
    const data = await fetchJson<{ jobs?: unknown }>(
      `${ASHBY_BASE}/${slug}?includeCompensation=true`,
    )
    return asArray(data.jobs).flatMap((entry) => {
      const job = entry as Record<string, unknown>
      const id = str(job.id)
      const title = str(job.title)
      const jobUrl = str(job.jobUrl)
      if (!id || !title || !jobUrl) return []
      const location = str(job.location)
      return [
        {
          providerId: "ats:ashby",
          sourceDisplayName: ashby.displayName(company.name),
          externalId: `ashby:${company.atsSlug}:${id}`,
          title,
          company: company.name,
          location,
          remoteType: remoteFrom(job.isRemote, location),
          description: stripHtml(str(job.descriptionPlain) ?? str(job.descriptionHtml)),
          postedAt: iso(job.publishedAt ?? job.updatedAt),
          applyUrl: str(job.applyUrl) ?? jobUrl,
          sourceUrl: jobUrl,
        } satisfies RawJob,
      ]
    })
  },
}

/* ===================== Workable ===================== */
// GET <base>/<slug>
const workable: AtsConnector = {
  id: "workable",
  displayName: (company) => `Halaman karier ${company} (Workable)`,
  async fetchJobs(company: AtsCompanyRef): Promise<RawJob[]> {
    const slug = encodeURIComponent(company.atsSlug)
    const data = await fetchJson<{ jobs?: unknown }>(`${WORKABLE_BASE}/${slug}`)
    return asArray(data.jobs).flatMap((entry) => {
      const job = entry as Record<string, unknown>
      const id = str(job.shortcode) ?? str(job.id)
      const title = str(job.title)
      const jobUrl = str(job.url) ?? str(job.application_url)
      if (!id || !title || !jobUrl) return []
      const locationField = job.location as Record<string, unknown> | string | undefined
      const location =
        typeof locationField === "string"
          ? str(locationField)
          : [str(locationField?.city), str(locationField?.country)].filter(Boolean).join(", ") ||
            null
      return [
        {
          providerId: "ats:workable",
          sourceDisplayName: workable.displayName(company.name),
          externalId: `workable:${company.atsSlug}:${id}`,
          title,
          company: company.name,
          location,
          remoteType: remoteFrom(job.telecommuting, location),
          description: stripHtml(str(job.description)),
          postedAt: iso(job.published_on ?? job.created_at),
          applyUrl: str(job.application_url) ?? jobUrl,
          sourceUrl: jobUrl,
        } satisfies RawJob,
      ]
    })
  },
}

/* ===================== Recruitee ===================== */
// GET https://<client>.recruitee.com/api/offers/
const recruitee: AtsConnector = {
  id: "recruitee",
  displayName: (company) => `Halaman karier ${company} (Recruitee)`,
  async fetchJobs(company: AtsCompanyRef): Promise<RawJob[]> {
    const slug = encodeURIComponent(company.atsSlug)
    const data = await fetchJson<{ offers?: unknown }>(
      `https://${slug}${RECRUITEE_HOST_SUFFIX}`,
    )
    return asArray(data.offers).flatMap((entry) => {
      const job = entry as Record<string, unknown>
      const id = str(job.id)
      const title = str(job.title)
      const careersUrl = str(job.careers_url) ?? str(job.careers_apply_url)
      if (!id || !title || !careersUrl) return []
      const location =
        [str(job.city), str(job.country)].filter(Boolean).join(", ") || str(job.location)
      return [
        {
          providerId: "ats:recruitee",
          sourceDisplayName: recruitee.displayName(company.name),
          externalId: `recruitee:${company.atsSlug}:${id}`,
          title,
          company: company.name,
          location,
          remoteType: remoteFrom(job.remote, location),
          description: stripHtml(str(job.description) ?? str(job.requirements)),
          postedAt: iso(job.published_at ?? job.created_at),
          applyUrl: str(job.careers_apply_url) ?? careersUrl,
          sourceUrl: careersUrl,
        } satisfies RawJob,
      ]
    })
  },
}

export const ATS_CONNECTORS: Record<string, AtsConnector> = {
  greenhouse,
  lever,
  ashby,
  workable,
  recruitee,
}

export function getAtsConnector(provider: string): AtsConnector | null {
  return ATS_CONNECTORS[provider] ?? null
}
