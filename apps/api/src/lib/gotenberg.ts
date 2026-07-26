import { env } from "./env"

/**
 * Klien Gotenberg (DOCX → PDF via LibreOffice) untuk fitur preview desain asli.
 *
 * - Lokal: `docker run --rm -p 3001:3000 gotenberg/gotenberg:8` lalu set
 *   GOTENBERG_URL="http://localhost:3001" di .env
 * - Production: Cloud Run dengan image `gotenberg/gotenberg:8-libreoffice-cloudrun`
 *   (minimal 1Gi RAM, concurrency 1). JANGAN diekspos publik — lindungi dengan
 *   IAM Cloud Run atau basic auth Gotenberg (--api-enable-basic-auth).
 * - Fitur ini opsional: tanpa GOTENBERG_URL, endpoint preview mengembalikan 503
 *   yang jelas dan UI otomatis menyembunyikan panel preview.
 */

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

export function gotenbergEnabled(): boolean {
  return Boolean(env.GOTENBERG_URL)
}

function baseUrl(): string {
  return (env.GOTENBERG_URL ?? "").replace(/\/+$/, "")
}

function authHeaders(): Record<string, string> {
  if (!env.GOTENBERG_BASIC_AUTH_USERNAME || !env.GOTENBERG_BASIC_AUTH_PASSWORD) return {}
  const token = Buffer.from(
    `${env.GOTENBERG_BASIC_AUTH_USERNAME}:${env.GOTENBERG_BASIC_AUTH_PASSWORD}`,
  ).toString("base64")
  return { Authorization: `Basic ${token}` }
}

/**
 * Warm-up fire-and-forget: ping /health supaya instance Cloud Run scale-to-zero
 * sudah hangat saat user benar-benar butuh konversi (mengurangi cold start).
 */
export function warmUpGotenberg(): void {
  if (!gotenbergEnabled()) return
  fetch(`${baseUrl()}/health`, {
    headers: authHeaders(),
    signal: AbortSignal.timeout(10_000),
  }).catch(() => {})
}

/**
 * Konversi buffer DOCX → PDF. Melempar Error biasa (GOTENBERG_DISABLED /
 * GOTENBERG_CONVERT_FAILED) — pemetaan ke HttpError dilakukan di service.
 */
export async function convertDocxToPdf(buffer: Buffer, filename = "document.docx"): Promise<Buffer> {
  if (!gotenbergEnabled()) throw new Error("GOTENBERG_DISABLED")
  const form = new FormData()
  form.append("files", new Blob([new Uint8Array(buffer)], { type: DOCX_MIME }), filename)
  const res = await fetch(`${baseUrl()}/forms/libreoffice/convert`, {
    method: "POST",
    body: form,
    headers: authHeaders(),
    // LibreOffice bisa lambat pada dokumen kompleks + cold start — beri ruang.
    signal: AbortSignal.timeout(90_000),
  })
  if (!res.ok) throw new Error(`GOTENBERG_CONVERT_FAILED: HTTP ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}
