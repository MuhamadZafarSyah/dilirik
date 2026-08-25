import { fetchJson, fetchText, stripHtml } from "./http.js"
import type { JobProvider, JobQuery, RawJob } from "./types.js"

/**
 * Provider Lowongan Lokal Indonesia (PRD Cari Lowongan §7.3).
 *
 * Mengumpulkan lowongan kerja On-site, Hybrid, dan Remote di kota-kota Indonesia
 * dari portal publik terpercaya:
 * 1. Glints Indonesia (API publik)
 * 2. Karir.com (Portal lowongan kerja Indonesia)
 */

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

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

/* ===================== 1. Glints Indonesia ===================== */

const GLINTS_API_BASE = "https://glints.com/api/v1/jobs"

export const glintsProvider: JobProvider = {
  id: "glints",
  displayName: "Glints",
  kind: "aggregator",
  costPerCall: 0,
  dailyCallBudget: 150,

  isEnabled() {
    return true // API publik tanpa auth key
  },

  async search(q: JobQuery): Promise<RawJob[]> {
    const keyword = q.keywords.join(" ").trim()
    if (!keyword) return []

    const params = new URLSearchParams({
      keyword,
      country: "ID",
      limit: "30",
      offset: "0",
    })

    if (q.location) {
      params.set("cityName", q.location)
    }

    try {
      const data = await fetchJson<{
        data?: Array<Record<string, unknown>>
        jobs?: Array<Record<string, unknown>>
      }>(`${GLINTS_API_BASE}?${params.toString()}`, {
        headers: {
          accept: "application/json",
          "accept-language": "id,en;q=0.9",
        },
      })

      const list = asArray(data.data ?? data.jobs ?? [])

      return list.flatMap((entry) => {
        const job = entry as Record<string, unknown>
        const id = str(job.id)
        const title = str(job.title)
        if (!title || !id) return []

        const companyObj = (job.company ?? {}) as Record<string, unknown>
        const companyName = str(companyObj.name) ?? "Perusahaan (Glints)"
        const city = str(job.cityName) ?? str(job.city)
        const country = str(job.country) ?? "Indonesia"
        const location = [city, country].filter(Boolean).join(", ")

        const isRemote =
          Boolean(job.isRemote) ||
          String(job.workplaceType ?? "").toLowerCase().includes("remote")

        const salary = (job.salaries ?? job.salary ?? {}) as Record<string, unknown>
        const minSalary = num(salary.minSalary ?? salary.min)
        const maxSalary = num(salary.maxSalary ?? salary.max)
        const currency = str(salary.currency) ?? "IDR"

        const applyUrl = `https://glints.com/id/opportunities/jobs/${id}`

        return [
          {
            providerId: "glints",
            sourceDisplayName: "Glints Indonesia",
            externalId: `glints:${id}`,
            title,
            company: companyName,
            location: location || null,
            remoteType: isRemote ? "remote" : null,
            description: stripHtml(str(job.description) ?? str(job.jobDescription)),
            salaryMin: minSalary,
            salaryMax: maxSalary,
            currency,
            salaryPeriod: "monthly",
            postedAt: str(job.createdAt) ?? str(job.updatedAt) ?? null,
            applyUrl,
            sourceUrl: applyUrl,
          } satisfies RawJob,
        ]
      })
    } catch {
      return []
    }
  },
}

/* ===================== 2. Karir.com Indonesia ===================== */

export const karirProvider: JobProvider = {
  id: "karir",
  displayName: "Karir.com",
  kind: "aggregator",
  costPerCall: 0,
  dailyCallBudget: 150,

  isEnabled() {
    return true
  },

  async search(q: JobQuery): Promise<RawJob[]> {
    const keyword = encodeURIComponent(q.keywords.join(" ").trim())
    if (!keyword) return []

    const locationQuery = q.location ? encodeURIComponent(q.location.trim()) : ""
    const targetUrl = `https://karir.com/search?q=${keyword}&location=${locationQuery}`

    try {
      const html = await fetchText(targetUrl)
      if (!html) return []

      const jobs: RawJob[] = []
      const cardRegex = /<article[\s\S]*?<\/article>|<div[^>]*class="[^"]*opportunity-card[^"]*"[\s\S]*?<\/div>\s*<\/div>/gi
      const cards = html.match(cardRegex) ?? []

      for (const card of cards.slice(0, 25)) {
        const titleMatch = card.match(/<h[234][^>]*>(?:<a[^>]*>)?(.*?)(?:<\/a>)?<\/h[234]>/i)
        const linkMatch = card.match(/href="([^"]*\/opportunities\/[^"]*|\/jobs\/[^"]*)"/i)
        const companyMatch = card.match(/class="[^"]*company-name[^"]*"[^>]*>(.*?)<\//i) || card.match(/class="[^"]*company[^"]*"[^>]*>(.*?)<\//i)
        const locationMatch = card.match(/class="[^"]*location[^"]*"[^>]*>(.*?)<\//i) || card.match(/class="[^"]*city[^"]*"[^>]*>(.*?)<\//i)
        const salaryMatch = card.match(/class="[^"]*salary[^"]*"[^>]*>(.*?)<\//i)

        const title = titleMatch ? stripHtml(titleMatch[1]) : null
        let applyUrl = linkMatch ? linkMatch[1] : null
        if (applyUrl && !applyUrl.startsWith("http")) {
          applyUrl = `https://karir.com${applyUrl}`
        }

        if (title && applyUrl) {
          const company = companyMatch ? stripHtml(companyMatch[1]) : "Perusahaan di Karir.com"
          const location = locationMatch ? stripHtml(locationMatch[1]) : (q.location || "Indonesia")
          const salaryText = salaryMatch ? stripHtml(salaryMatch[1]) : null

          let salaryMin: number | null = null
          let salaryMax: number | null = null
          if (salaryText) {
            const numbers = salaryText.replace(/[^0-9]/g, " ").trim().split(/\s+/).map(Number).filter((n) => n > 100_000)
            if (numbers.length >= 2) {
              salaryMin = Math.min(...numbers)
              salaryMax = Math.max(...numbers)
            } else if (numbers.length === 1 && numbers[0] !== undefined) {
              salaryMin = numbers[0]
            }
          }

          const externalId = `karir:${applyUrl.split("/").pop() ?? applyUrl}`

          jobs.push({
            providerId: "karir",
            sourceDisplayName: "Karir.com",
            externalId,
            title,
            company,
            location,
            remoteType: title.toLowerCase().includes("remote") ? "remote" : null,
            description: `${title} di ${company} (${location})`,
            salaryMin,
            salaryMax,
            currency: "IDR",
            salaryPeriod: "monthly",
            postedAt: new Date().toISOString(),
            applyUrl,
            sourceUrl: applyUrl,
          })
        }
      }

      return jobs
    } catch {
      return []
    }
  },
}

export const INDONESIA_PROVIDERS: JobProvider[] = [glintsProvider, karirProvider]

