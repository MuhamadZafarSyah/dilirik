import { env } from "./env"
import { logger } from "./logger"

/**
 * Verifikasi CAPTCHA server-side. Mendukung dua provider (pilih salah satu):
 * - Cloudflare Turnstile  — set TURNSTILE_SECRET_KEY (diprioritaskan)
 * - Google reCAPTCHA v3   — set RECAPTCHA_SECRET_KEY (+ CAPTCHA_MIN_SCORE)
 *
 * Jika tidak ada key yang di-set, CAPTCHA nonaktif (dev tetap mulus).
 */
export const captchaEnabled = Boolean(env.TURNSTILE_SECRET_KEY || env.RECAPTCHA_SECRET_KEY)

type VerifyResult = { ok: boolean; reason?: string }

async function postForm(url: string, form: Record<string, string>): Promise<Record<string, unknown>> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(form).toString(),
      signal: controller.signal,
    })
    return (await res.json()) as Record<string, unknown>
  } finally {
    clearTimeout(timeout)
  }
}

export async function verifyCaptcha(token: string, remoteIp?: string): Promise<VerifyResult> {
  if (!captchaEnabled) return { ok: true }
  if (!token || token.length > 4096) return { ok: false, reason: "missing or malformed token" }

  try {
    if (env.TURNSTILE_SECRET_KEY) {
      const data = await postForm("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        secret: env.TURNSTILE_SECRET_KEY,
        response: token,
        ...(remoteIp ? { remoteip: remoteIp } : {}),
      })
      if (data.success === true) return { ok: true }
      return { ok: false, reason: `turnstile: ${JSON.stringify(data["error-codes"] ?? [])}` }
    }

    const data = await postForm("https://www.google.com/recaptcha/api/siteverify", {
      secret: env.RECAPTCHA_SECRET_KEY!,
      response: token,
      ...(remoteIp ? { remoteip: remoteIp } : {}),
    })
    if (data.success !== true) {
      return { ok: false, reason: `recaptcha: ${JSON.stringify(data["error-codes"] ?? [])}` }
    }
    // reCAPTCHA v3: skor 0.0 (bot) – 1.0 (manusia)
    const score = typeof data.score === "number" ? data.score : undefined
    if (score !== undefined && score < env.CAPTCHA_MIN_SCORE) {
      return { ok: false, reason: `recaptcha score ${score} < ${env.CAPTCHA_MIN_SCORE}` }
    }
    return { ok: true }
  } catch (error) {
    // Fail-open: outage provider CAPTCHA tidak boleh melumpuhkan login seluruh user.
    logger.warn({ err: error }, "captcha verification unavailable — failing open")
    return { ok: true }
  }
}
