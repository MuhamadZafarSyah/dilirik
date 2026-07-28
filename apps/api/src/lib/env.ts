import { z } from "zod"

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  // Jumlah hop reverse-proxy terpercaya di depan API (Cloudflare/LB) — dipakai
  // express `trust proxy` supaya req.ip & cookie `secure` bekerja benar.
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(1),
  DATABASE_URL: z.string().min(1),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  BETTER_AUTH_SECRET: z.string().min(16),
  BETTER_AUTH_URL: z.string().url(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  LLM_BASE_URL: z.string().optional(),
  LLM_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().default("fable-5"),
  // Gemini Live (Live Mock Interview) — hanya untuk mencetak ephemeral token; TIDAK pernah ke browser
  GEMINI_API_KEY: z.string().optional(),
  // Gotenberg (preview desain DOCX→PDF) — service internal; jangan diekspos publik
  GOTENBERG_URL: z.string().optional(),
  GOTENBERG_BASIC_AUTH_USERNAME: z.string().optional(),
  GOTENBERG_BASIC_AUTH_PASSWORD: z.string().optional(),
  // Adobe PDF Services (konversi PDF→DOCX agar desain asli CV dipertahankan) — opsional.
  // Kosongkan untuk menonaktifkan; upload PDF akan memakai template Dilirik seperti biasa.
  PDF_SERVICES_CLIENT_ID: z.string().optional(),
  PDF_SERVICES_CLIENT_SECRET: z.string().optional(),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().default("dilirik-uploads"),
  RESEND_API_KEY: z.string().optional(),
  MAIL_FROM: z.string().default("Dilirik <no-reply@dilirik.app>"),
  SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
  // ===== CAPTCHA (pilih salah satu provider; kosong = nonaktif) =====
  // Cloudflare Turnstile (diprioritaskan bila keduanya di-set)
  TURNSTILE_SECRET_KEY: z.string().optional(),
  // Google reCAPTCHA v3
  RECAPTCHA_SECRET_KEY: z.string().optional(),
  CAPTCHA_MIN_SCORE: z.coerce.number().min(0).max(1).default(0.5),
})

/** Validasi env saat boot — fail fast dengan pesan jelas. */
export const env = envSchema.parse(process.env)
