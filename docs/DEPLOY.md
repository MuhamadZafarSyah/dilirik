# 🚀 Deploy Dilirik ke Production

Panduan end-to-end men-deploy Dilirik: **web di Vercel**, **API di Railway (Docker)**, **DB di Neon**, **Redis di Upstash**.

## 0. Prasyarat

- Akun: [Neon](https://neon.tech), [Upstash](https://upstash.com), [Vercel](https://vercel.com), [Railway](https://railway.app), [Resend](https://resend.com), [Cloudflare R2](https://developers.cloudflare.com/r2/) (opsional), [Sentry](https://sentry.io) & [PostHog](https://posthog.com) (opsional).
- API key LLM (OpenAI-compatible) — model default: **`fable-5`**.

## 1. Database — Neon

1. Buat project Neon → salin `DATABASE_URL` (pakai *pooled connection string* untuk runtime).
2. Jalankan migrasi dari lokal:
   ```bash
   DATABASE_URL="postgres://..." pnpm --filter @dilirik/db db:migrate:deploy
   ```

## 2. Redis — Upstash

1. Buat database Redis → salin `UPSTASH_REDIS_REST_URL` dan `UPSTASH_REDIS_REST_TOKEN`.

## 3. OAuth — Google & GitHub

| Provider | Callback URL |
|---|---|
| Google (GCP Console → OAuth consent + credentials) | `https://api.dilirik.app/api/auth/callback/google` |
| GitHub (Settings → Developer settings → OAuth Apps) | `https://api.dilirik.app/api/auth/callback/github` |

Salin `GOOGLE_CLIENT_ID/SECRET` dan `GITHUB_CLIENT_ID/SECRET`.

## 4. API — Railway (Docker)

1. New Project → Deploy from GitHub repo → pilih repo ini.
2. Set **Root Directory** = `/` dan **Dockerfile Path** = `apps/api/Dockerfile`.
3. Set environment variables (lihat `.env.example`), minimal:
   `DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL (=https://api.dilirik.app), CORS_ORIGIN (=https://dilirik.app), UPSTASH_*, LLM_BASE_URL, LLM_API_KEY, LLM_MODEL=fable-5, RESEND_API_KEY, MAIL_FROM, NEXT_PUBLIC_APP_URL`.
4. Tambahkan custom domain `api.dilirik.app` → arahkan DNS.
5. Healthcheck: `GET /health` harus balas `{"status":"ok"}`.

## 5. Web — Vercel

1. Import repo → Framework: Next.js → **Root Directory**: `apps/web`.
2. Env vars: `NEXT_PUBLIC_API_URL=https://api.dilirik.app`, `NEXT_PUBLIC_APP_URL=https://dilirik.app`, `NEXT_PUBLIC_POSTHOG_KEY/HOST` (opsional).
3. Domain: `dilirik.app`.

> ⚠️ Cookie lintas subdomain: karena web (`dilirik.app`) dan API (`api.dilirik.app`) beda subdomain, pastikan `BETTER_AUTH_URL` mengarah ke API dan `trustedOrigins` memuat domain web (sudah dikonfigurasi via `CORS_ORIGIN`).

## 6. Email — Resend

1. Verifikasi domain `dilirik.app` (DNS: DKIM + SPF).
2. Set `RESEND_API_KEY` dan `MAIL_FROM="Dilirik <no-reply@dilirik.app>"` di Railway.

## 7. Observability (opsional tapi disarankan)

- **Sentry**: set `SENTRY_DSN` di Railway (error API otomatis terkirim).
- **PostHog**: set `NEXT_PUBLIC_POSTHOG_KEY` + `NEXT_PUBLIC_POSTHOG_HOST` di Vercel.

## 8. Checklist rilis (PRD §17)

- [ ] `pnpm turbo lint typecheck test build` hijau di CI
- [ ] Migrasi Prisma sudah dijalankan ke Neon production
- [ ] Register → email verifikasi terkirim → login OK
- [ ] OAuth Google & GitHub OK di domain production
- [ ] Upload CV PDF & DOCX → terparse
- [ ] Analisis end-to-end → skor + gap + saran muncul
- [ ] Kuota: user free terblokir di analisis ke-11 dengan pesan ramah
- [ ] Cache: analisis pasangan sama tidak mengurangi kuota
- [ ] Tracker lamaran: ubah status + catatan tersimpan
- [ ] Halaman legal (privacy/terms) tampil

## 9. Set kuota manual (beta/promo)

```sql
-- unlimited untuk user tertentu
UPDATE "user" SET "analysisQuota" = NULL WHERE email = 'orang@keren.com';
-- atau naikkan ke 100
UPDATE "user" SET "analysisQuota" = 100 WHERE email = 'beta@tester.com';
```
