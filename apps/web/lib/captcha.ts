"use client"

/**
 * Client-side CAPTCHA helper. Mendukung dua provider (pilih salah satu via env):
 * - NEXT_PUBLIC_TURNSTILE_SITE_KEY → Cloudflare Turnstile (widget invisible)
 * - NEXT_PUBLIC_RECAPTCHA_SITE_KEY → Google reCAPTCHA v3 (score-based, tanpa challenge)
 *
 * Jika tidak ada key → CAPTCHA nonaktif dan getCaptchaToken() mengembalikan null
 * (API juga otomatis melewati verifikasi saat secret key tidak di-set).
 */
const TURNSTILE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
const RECAPTCHA_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY

export const captchaEnabled = Boolean(TURNSTILE_KEY || RECAPTCHA_KEY)

type GrecaptchaLike = {
  ready: (cb: () => void) => void
  execute: (siteKey: string, opts: { action: string }) => Promise<string>
}

type TurnstileLike = {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string
      callback: (token: string) => void
      "error-callback": () => void
      appearance?: string
      size?: string
    },
  ) => string
  remove: (widgetId: string) => void
}

const scriptPromises = new Map<string, Promise<void>>()

function loadScript(src: string): Promise<void> {
  const existing = scriptPromises.get(src)
  if (existing) return existing
  const promise = new Promise<void>((resolve, reject) => {
    const el = document.createElement("script")
    el.src = src
    el.async = true
    el.onload = () => resolve()
    el.onerror = () => reject(new Error(`Gagal memuat ${src}`))
    document.head.appendChild(el)
  })
  scriptPromises.set(src, promise)
  return promise
}

async function getRecaptchaToken(action: string): Promise<string | null> {
  await loadScript(`https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_KEY}`)
  const grecaptcha = (window as unknown as { grecaptcha?: GrecaptchaLike }).grecaptcha
  if (!grecaptcha) return null
  await new Promise<void>((resolve) => grecaptcha.ready(resolve))
  return grecaptcha.execute(RECAPTCHA_KEY!, { action })
}

async function getTurnstileToken(): Promise<string | null> {
  await loadScript("https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit")
  const turnstile = (window as unknown as { turnstile?: TurnstileLike }).turnstile
  if (!turnstile) return null
  const container = document.createElement("div")
  container.style.position = "fixed"
  container.style.bottom = "12px"
  container.style.right = "12px"
  container.style.zIndex = "9999"
  document.body.appendChild(container)
  try {
    return await new Promise<string | null>((resolve) => {
      const timeout = setTimeout(() => resolve(null), 20000)
      turnstile.render(container, {
        sitekey: TURNSTILE_KEY!,
        appearance: "interaction-only",
        callback: (token: string) => {
          clearTimeout(timeout)
          resolve(token)
        },
        "error-callback": () => {
          clearTimeout(timeout)
          resolve(null)
        },
      })
    })
  } finally {
    container.remove()
  }
}

/**
 * Ambil token CAPTCHA untuk dikirim sebagai header `x-captcha-token`.
 * Mengembalikan null saat CAPTCHA nonaktif atau gagal dimuat (API akan menolak
 * bila verifikasi wajib — user cukup coba lagi).
 */
export async function getCaptchaToken(action: string): Promise<string | null> {
  try {
    if (TURNSTILE_KEY) return await getTurnstileToken()
    if (RECAPTCHA_KEY) return await getRecaptchaToken(action)
    return null
  } catch {
    return null
  }
}
