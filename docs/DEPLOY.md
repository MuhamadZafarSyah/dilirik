# 🚀 Deploy Dilirik ke Production

Panduan end-to-end men-deploy Dilirik: **web di Vercel**, **API di Render atau Koyeb (Docker)**, **DB di Neon**, **Redis di Upstash**. Domain production: **`dilirik.tech`**.

## 0. Prasyarat

- Akun: [Neon](https://neon.tech), [Upstash](https://upstash.com), [Vercel](https://vercel.com), [Render](https://render.com) atau [Koyeb](https://koyeb.com), [Resend](https://resend.com), [Cloudflare R2](https://developers.cloudflare.com/r2/) (opsional), [Sentry](https://sentry.io) & [PostHog](https://posthog.com) (opsional).
- API key LLM (OpenAI-compatible) — model default: **`fable-5`**.

> 🚨 **Baca sebelum build pertama.** Semua env `NEXT_PUBLIC_*` di-**inline saat build**, bukan dibaca saat runtime. Konsekuensinya:
> • Bila `NEXT_PUBLIC_API_URL` belum di-set saat build pertama, CSP production akan memuat `http://localhost:4000` dan **seluruh panggilan API diblokir browser** — tanpa error apa pun di log server.
> • Bila `NEXT_PUBLIC_APP_URL` belum di-set, canonical, sitemap, dan JSON-LD memakai fallback `https://dilirik.tech`.
> • Mengubah env di dashboard **tidak berpengaruh sampai ada redeploy**.

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
| Google (GCP Console → OAuth consent + credentials) | `https://api.dilirik.tech/api/auth/callback/google` |
| GitHub (Settings → Developer settings → OAuth Apps) | `https://api.dilirik.tech/api/auth/callback/github` |

Salin `GOOGLE_CLIENT_ID/SECRET` dan `GITHUB_CLIENT_ID/SECRET`.

## 4. API — Render / Koyeb (Docker)

1. New Web Service → Deploy from GitHub repo → pilih repo ini.
2. Set **Root Directory** = `/` dan **Dockerfile Path** = `apps/api/Dockerfile`.
3. Set environment variables (lihat `.env.example`), minimal:
   `DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL (=https://api.dilirik.tech), CORS_ORIGIN (=https://dilirik.tech), NEXT_PUBLIC_APP_URL (=https://dilirik.tech), UPSTASH_*, LLM_BASE_URL, LLM_API_KEY, LLM_MODEL=fable-5, RESEND_API_KEY, MAIL_FROM`.
4. Tambahkan custom domain `api.dilirik.tech` → arahkan DNS.
5. Healthcheck: `GET /health` harus balas `{"status":"ok"}`.

> `CORS_ORIGIN` cukup **apex saja** (`https://dilirik.tech`). Karena `www` di-redirect di level Vercel sebelum request menyentuh aplikasi, `www.dilirik.tech` tidak akan pernah muncul sebagai Origin.

> ⏱️ Free tier Render/Koyeb menidurkan service yang idle, sehingga request pertama bisa lambat beberapa detik. Ini **tidak** memengaruhi SEO — halaman publik dirender Vercel dan tidak memanggil API.

## 5. Web — Vercel

1. Import repo → Framework: Next.js → **Root Directory**: `apps/web`.
2. Env vars: `NEXT_PUBLIC_API_URL=https://api.dilirik.tech`, `NEXT_PUBLIC_APP_URL=https://dilirik.tech`, lalu `NEXT_PUBLIC_GA_ID` dan `NEXT_PUBLIC_POSTHOG_KEY/HOST` (opsional).
3. **Set semua env di atas SEBELUM build pertama** (lihat peringatan di bagian 0).

### 5.1 Dua host, satu URL kanonik

Situs dilayani di `dilirik.tech` **dan** `www.dilirik.tech`, tetapi Google hanya boleh mengindeks satu. Redirect diatur di **level platform**, bukan di `next.config.mjs`, agar berlaku di edge dan tidak bisa hilang karena perubahan kode:

1. Project Settings → **Domains** → tambahkan **`dilirik.tech`** dan **`www.dilirik.tech`**.
2. Set **`dilirik.tech` sebagai Primary Domain**.
3. Vercel otomatis membuat redirect **308 permanen** dari `www` ke apex, mempertahankan path dan query string.
4. Vercel menerbitkan sertifikat TLS untuk **kedua** host. Ini wajib: header `Strict-Transport-Security` sudah aktif dengan `includeSubDomains`, sehingga browser menolak `www` tanpa TLS valid **sebelum** redirect sempat berjalan.
5. Verifikasi setelah deploy:
   ```bash
   curl -sI https://www.dilirik.tech/pricing | grep -i -E "^(HTTP|location)"
   # harus: HTTP/2 308  +  location: https://dilirik.tech/pricing
   ```

> ⚠️ Karena langkah ini hidup di dashboard Vercel dan tidak terlihat di kode, jangan hapus bagian ini. Kalau Primary Domain tersetel ke `www`, seluruh canonical tag di aplikasi (yang menunjuk apex) akan bertentangan dengan redirect — dan Google akan bingung memilih.

### 5.2 Aset ikon

Sebelum deploy pertama, taruh 4 berkas di `apps/web/public/` sesuai kontrak di `apps/web/public/README.md`: `favicon.ico` (32x32), `icon.png` (512x512), `apple-icon.png` (180x180), `og-image.png` (1200x630). Kode sudah merujuknya; selama belum ada, jalur itu menjawab 404 dan pratinjau tautan tampil kosong.

> ⚠️ Cookie lintas subdomain: karena web (`dilirik.tech`) dan API (`api.dilirik.tech`) beda subdomain, pastikan `BETTER_AUTH_URL` mengarah ke API dan `trustedOrigins` memuat domain web (sudah dikonfigurasi via `CORS_ORIGIN` dan `NEXT_PUBLIC_APP_URL`).

## 6. Email — Resend

1. Verifikasi domain `dilirik.tech` (DNS: DKIM + SPF).
2. Set `RESEND_API_KEY` dan `MAIL_FROM="Dilirik <no-reply@dilirik.tech>"` di hosting API.

## 7. Observability & Analytics

- **Sentry**: set `SENTRY_DSN` di hosting API (error API otomatis terkirim).
- **GA4**: buat property → salin Measurement ID → set `NEXT_PUBLIC_GA_ID` di Vercel → **redeploy**. GA dimuat dengan Consent Mode v2 (`denied` secara default), jadi data baru masuk setelah pengunjung menekan “Izinkan”.
- **PostHog**: set `NEXT_PUBLIC_POSTHOG_KEY` + `NEXT_PUBLIC_POSTHOG_HOST` di Vercel.
- Bila ketiganya kosong, banner consent tidak muncul sama sekali — memang begitu perilakunya.

## 8. Search Console & Bing

1. [Google Search Console](https://search.google.com/search-console) → tambahkan **Domain property** `dilirik.tech` (verifikasi via DNS TXT, mencakup apex + www + semua subdomain sekaligus).
2. Submit `https://dilirik.tech/sitemap.xml`.
3. [Bing Webmaster Tools](https://www.bing.com/webmasters) → import dari GSC (juga menyuplai Copilot).
4. Cek `https://dilirik.tech/robots.txt` sudah menunjuk sitemap yang benar.

## 9. Checklist rilis

- [ ] `pnpm turbo lint typecheck test build` hijau di CI
- [ ] Semua env `NEXT_PUBLIC_*` di-set **sebelum** build pertama di Vercel
- [ ] Migrasi Prisma sudah dijalankan ke Neon production
- [ ] 4 berkas ikon sudah ada di `apps/web/public/`
- [ ] `curl -sI https://www.dilirik.tech` → 308 ke apex
- [ ] `curl -s https://dilirik.tech/sitemap.xml` → semua URL apex, tidak ada 404
- [ ] Register → email verifikasi terkirim → login OK
- [ ] OAuth Google & GitHub OK di domain production
- [ ] Upload CV PDF & DOCX → terparse
- [ ] Analisis end-to-end → skor + gap + saran muncul
- [ ] Kuota: user free terblokir di analisis ke-11 dengan pesan ramah
- [ ] Cache: analisis pasangan sama tidak mengurangi kuota
- [ ] Tracker lamaran: ubah status + catatan tersimpan
- [ ] Halaman `/legal/privacy` tampil
- [ ] Banner consent muncul, “Izinkan” membuat event masuk ke GA4 Realtime

## 10. Set kuota manual (beta/promo)

```sql
-- unlimited untuk user tertentu
UPDATE "user" SET "analysisQuota" = NULL WHERE email = 'orang@keren.com';
-- atau naikkan ke 100
UPDATE "user" SET "analysisQuota" = 100 WHERE email = 'beta@tester.com';
```
