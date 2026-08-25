/**
 * HTTP client kecil untuk provider lowongan.
 *
 * Tiga hal yang wajib ada dan tidak boleh diserahkan ke `fetch` mentah:
 * timeout (provider gratis bisa menggantung), backoff untuk 429/5xx, dan
 * User-Agent yang jujur menyebut siapa kita — itu bagian dari beretika saat
 * menarik data publik.
 */

export const JOBS_USER_AGENT =
  "DilirikJobDiscovery/1.0 (+https://dilirik.tech; kontak: admin@dilirik.tech)"

export class ProviderHttpError extends Error {
  constructor(
    readonly status: number,
    readonly url: string,
    message: string,
  ) {
    super(message)
    this.name = "ProviderHttpError"
  }
}

const RETRYABLE = new Set([408, 425, 429, 500, 502, 503, 504])

export async function fetchJson<T>(
  url: string,
  options: {
    timeoutMs?: number
    retries?: number
    headers?: Record<string, string>
    method?: "GET" | "POST"
    body?: unknown
  } = {},
): Promise<T> {
  const { timeoutMs = 12_000, retries = 2, headers = {}, method = "GET", body } = options

  let lastError: unknown
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetch(url, {
        method,
        signal: controller.signal,
        headers: {
          accept: "application/json",
          "user-agent": JOBS_USER_AGENT,
          ...(body ? { "content-type": "application/json" } : {}),
          ...headers,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      })

      if (!response.ok) {
        const error = new ProviderHttpError(
          response.status,
          url,
          `HTTP ${response.status} dari ${new URL(url).host}`,
        )
        if (RETRYABLE.has(response.status) && attempt <= retries) {
          lastError = error
          await sleep(500 * attempt * attempt)
          continue
        }
        throw error
      }

      return (await response.json()) as T
    } catch (error) {
      lastError = error
      if (error instanceof ProviderHttpError && !RETRYABLE.has(error.status)) throw error
      if (attempt > retries) break
      await sleep(500 * attempt * attempt)
    } finally {
      clearTimeout(timer)
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

export async function fetchText(
  url: string,
  options: {
    timeoutMs?: number
    retries?: number
    headers?: Record<string, string>
  } = {},
): Promise<string> {
  const { timeoutMs = 12_000, retries = 2, headers = {} } = options

  let lastError: unknown
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          ...headers,
        },
      })

      if (!response.ok) {
        const error = new ProviderHttpError(
          response.status,
          url,
          `HTTP ${response.status} dari ${new URL(url).host}`,
        )
        if (RETRYABLE.has(response.status) && attempt <= retries) {
          lastError = error
          await sleep(500 * attempt * attempt)
          continue
        }
        throw error
      }

      return await response.text()
    } catch (error) {
      lastError = error
      if (error instanceof ProviderHttpError && !RETRYABLE.has(error.status)) throw error
      if (attempt > retries) break
      await sleep(500 * attempt * attempt)
    } finally {
      clearTimeout(timer)
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Buang tag HTML dari deskripsi ATS tanpa menarik dependensi parser. */
export function stripHtml(input: string | null | undefined): string {
  if (!input) return ""
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim()
}
