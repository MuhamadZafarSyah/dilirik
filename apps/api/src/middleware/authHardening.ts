import type { NextFunction, Request, Response } from "express"
import { captchaEnabled, verifyCaptcha } from "../lib/captcha"
import { logger } from "../lib/logger"
import { rateLimit } from "./rateLimit"
import { getClientIp } from "./security"

/**
 * Pengerasan endpoint auth (anti brute-force & bot sign-up).
 * Dipasang di depan handler Better Auth (`/api/auth/*`):
 * 1. Rate limit ketat per-IP untuk endpoint sensitif.
 * 2. Wajib token CAPTCHA (header `x-captcha-token`) saat CAPTCHA diaktifkan.
 *
 * Catatan: req.path di sini RELATIF terhadap mount point "/api/auth".
 */
const SENSITIVE_LIMITERS: Record<string, ReturnType<typeof rateLimit>> = {
  "/sign-in/email": rateLimit("auth-signin", 10, 300), // 10x / 5 menit / IP
  "/sign-up/email": rateLimit("auth-signup", 5, 3600), // 5x / jam / IP
  "/forget-password": rateLimit("auth-forgot", 3, 900), // 3x / 15 menit / IP
  "/request-password-reset": rateLimit("auth-forgot", 3, 900),
}

const CAPTCHA_PROTECTED = new Set([
  "/sign-in/email",
  "/sign-up/email",
  "/forget-password",
  "/request-password-reset",
])

async function captchaGate(req: Request, res: Response, next: NextFunction) {
  if (!captchaEnabled || !CAPTCHA_PROTECTED.has(req.path)) {
    next()
    return
  }
  const token = req.headers["x-captcha-token"]
  const result = await verifyCaptcha(typeof token === "string" ? token : "", getClientIp(req))
  if (!result.ok) {
    logger.warn({ path: req.path, ip: getClientIp(req), reason: result.reason }, "captcha rejected")
    res.status(403).json({
      error: "CAPTCHA_FAILED",
      message: "Verifikasi keamanan gagal — muat ulang halaman lalu coba lagi",
    })
    return
  }
  next()
}

export function authHardening(req: Request, res: Response, next: NextFunction) {
  if (req.method.toUpperCase() !== "POST") {
    next()
    return
  }
  const limiter = SENSITIVE_LIMITERS[req.path]
  if (limiter) {
    void limiter(req, res, (err?: unknown) => {
      if (err) {
        next(err)
        return
      }
      void captchaGate(req, res, next)
    })
    return
  }
  void captchaGate(req, res, next)
}
