import { env } from "./env"
import { logger } from "./logger"

/**
 * Klien Adobe PDF Services (REST) — konversi PDF → DOCX dengan fidelity tinggi
 * (engine yang sama kelasnya dengan Acrobat \"Export PDF\"), supaya CV yang
 * di-upload sebagai PDF tetap bisa masuk pipeline revisi DOCX-native tanpa
 * kehilangan desain asli user.
 *
 * - Free tier: 500 Document Transactions/bulan (cukup, karena konversi hanya
 *   terjadi SEKALI per upload — hasilnya di-cache di R2, revisi tidak memakai kuota).
 * - Opsional: tanpa PDF_SERVICES_CLIENT_ID/SECRET fitur mati dan upload PDF
 *   memakai jalur template seperti sebelumnya (fail-open, tidak ada yang rusak).
 * - Zero dependency: murni fetch bawaan Node (pola yang sama dengan gotenberg.ts).
 *
 * Alur REST resmi: token → create asset → upload ke presigned URI → job
 * /operation/exportpdf → poll status → download hasil.
 */

const BASE = "https://pdf-services.adobe.io"

export function adobePdfEnabled(): boolean {
  return Boolean(env.PDF_SERVICES_CLIENT_ID && env.PDF_SERVICES_CLIENT_SECRET)
}

// Token OAuth server-to-server berlaku ~24 jam — cache di memori, refresh 1 menit lebih awal.
let cachedToken: { token: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) return cachedToken.token
  const res = await fetch(`${BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.PDF_SERVICES_CLIENT_ID!,
      client_secret: env.PDF_SERVICES_CLIENT_SECRET!,
    }),
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`ADOBE_TOKEN_FAILED: HTTP ${res.status}`)
  const data = (await res.json()) as { access_token: string; expires_in: number }
  cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 }
  return data.access_token
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, "x-api-key": env.PDF_SERVICES_CLIENT_ID! }
}

type PollResult = {
  status: "in progress" | "done" | "failed" | string
  asset?: { downloadUri?: string }
  error?: { code?: string; message?: string }
}

/**
 * Konversi buffer PDF → buffer DOCX. Melempar Error biasa (ADOBE_*) — caller
 * WAJIB memperlakukan ini sebagai best-effort dan fallback ke jalur template.
 */
export async function convertPdfToDocx(pdf: Buffer): Promise<Buffer> {
  if (!adobePdfEnabled()) throw new Error("ADOBE_PDF_DISABLED")
  const started = Date.now()
  const deadline = started + 90_000 // total budget konversi
  const token = await getAccessToken()

  // 1. Minta slot asset (dapat assetID + presigned upload URI)
  const assetRes = await fetch(`${BASE}/assets`, {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ mediaType: "application/pdf" }),
    signal: AbortSignal.timeout(15_000),
  })
  if (!assetRes.ok) throw new Error(`ADOBE_ASSET_FAILED: HTTP ${assetRes.status}`)
  const { assetID, uploadUri } = (await assetRes.json()) as { assetID: string; uploadUri: string }

  // 2. Upload PDF ke presigned URI (tanpa header auth — URI sudah bertanda tangan)
  const putRes = await fetch(uploadUri, {
    method: "PUT",
    headers: { "Content-Type": "application/pdf" },
    body: new Uint8Array(pdf),
    signal: AbortSignal.timeout(30_000),
  })
  if (!putRes.ok) throw new Error(`ADOBE_UPLOAD_FAILED: HTTP ${putRes.status}`)

  // 3. Buat job Export PDF → DOCX (201 + header location untuk polling)
  const jobRes = await fetch(`${BASE}/operation/exportpdf`, {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ assetID, targetFormat: "docx" }),
    signal: AbortSignal.timeout(15_000),
  })
  if (jobRes.status === 429) throw new Error("ADOBE_QUOTA_EXCEEDED")
  if (jobRes.status !== 201) throw new Error(`ADOBE_JOB_FAILED: HTTP ${jobRes.status}`)
  const pollUrl = jobRes.headers.get("location")
  if (!pollUrl) throw new Error("ADOBE_JOB_FAILED: header location kosong")

  // 4. Poll status sampai done/failed/timeout
  for (;;) {
    if (Date.now() > deadline) throw new Error("ADOBE_TIMEOUT")
    await new Promise((r) => setTimeout(r, 2_000))
    const pollRes = await fetch(pollUrl, {
      headers: authHeaders(token),
      signal: AbortSignal.timeout(15_000),
    })
    if (!pollRes.ok) throw new Error(`ADOBE_POLL_FAILED: HTTP ${pollRes.status}`)
    const data = (await pollRes.json()) as PollResult

    if (data.status === "done" && data.asset?.downloadUri) {
      // 5. Download DOCX hasil konversi (presigned URI, tanpa auth)
      const dl = await fetch(data.asset.downloadUri, { signal: AbortSignal.timeout(30_000) })
      if (!dl.ok) throw new Error(`ADOBE_DOWNLOAD_FAILED: HTTP ${dl.status}`)
      const buffer = Buffer.from(await dl.arrayBuffer())
      logger.info({ ms: Date.now() - started, bytes: buffer.byteLength }, "Adobe PDF→DOCX selesai")
      return buffer
    }
    if (data.status === "failed") {
      throw new Error(`ADOBE_CONVERT_FAILED: ${data.error?.message ?? data.error?.code ?? "unknown"}`)
    }
  }
}
