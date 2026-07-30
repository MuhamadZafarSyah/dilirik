import type { NextFunction, Request, Response } from "express"
import { logger } from "../lib/logger"
import { getAllowedOrigins } from "../lib/origins"

const allowedOrigins = new Set(getAllowedOrigins())

/**
 * IP asli client. Di belakang Cloudflare, header `CF-Connecting-IP` adalah
 * sumber paling terpercaya (di-set oleh edge CF, tidak bisa dipalsukan selama
 * origin hanya menerima traffic dari CF). Fallback ke req.ip (trust proxy).
 */
export function getClientIp(req: Request): string {
  const cf = req.headers["cf-connecting-ip"]
  if (typeof cf === "string" && cf.length > 0 && cf.length < 64) return cf
  return req.ip ?? "unknown"
}

/**
 * CSRF defense-in-depth (selain CORS + SameSite cookie):
 * semua request state-changing (POST/PUT/PATCH/DELETE) yang membawa header
 * Origin WAJIB berasal dari origin yang di-allowlist. Request tanpa Origin
 * (curl, server-to-server, health check) dibiarkan lewat karena browser tidak
 * mungkin mengirim cookie korban tanpa menyertakan Origin pada cross-site POST.
 */
export function originCheck(req: Request, res: Response, next: NextFunction) {
  const method = req.method.toUpperCase()
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    next()
    return
  }
  const origin = req.headers.origin
  if (!origin) {
    next()
    return
  }
  if (!allowedOrigins.has(origin)) {
    logger.warn({ origin, path: req.path, ip: getClientIp(req) }, "blocked cross-origin write")
    res.status(403).json({
      error: "FORBIDDEN_ORIGIN",
      message: "Permintaan ditolak: origin tidak dikenal",
    })
    return
  }
  next()
}

// Buang null byte & control chars berbahaya, tapi pertahankan \n \r \t.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g
const MAX_DEPTH = 12

function sanitizeValue(value: unknown, depth: number): unknown {
  if (depth > MAX_DEPTH) return value
  if (typeof value === "string") return value.replace(CONTROL_CHARS, "")
  if (Array.isArray(value)) return value.map((v) => sanitizeValue(v, depth + 1))
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      // Tolak kunci berbahaya (prototype pollution via JSON body)
      if (k === "__proto__" || k === "constructor" || k === "prototype") continue
      out[k] = sanitizeValue(v, depth + 1)
    }
    return out
  }
  return value
}

/**
 * Sanitasi body request (anti stored-XSS payload aneh & prototype pollution):
 * strip control characters dari seluruh string dan buang kunci __proto__/constructor.
 * Konten tetap ditampilkan sebagai teks di React (auto-escape) — ini lapisan ekstra.
 */
export function sanitizeRequest(req: Request, _res: Response, next: NextFunction) {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeValue(req.body, 0)
  }
  next()
}
