# Security — Dilirik

Dokumen ini merangkum lapisan keamanan yang sudah diimplementasikan di kode, plus panduan konfigurasi infrastruktur (Cloudflare) yang harus dilakukan manual di dashboard saat deploy production.

## 1. Lapisan yang Sudah Ada di Kode

### API (Express)

| Lapisan | Implementasi |
|---|---|
| Rate limiting global | `rateLimit("global", 300, 60)` — 300 req/menit per user/IP, Redis fixed-window, header `RateLimit-*` + `Retry-After` |
| Rate limiting auth | sign-in 10/5mnt, sign-up 5/jam, forgot-password 3/15mnt (`authHardening`) |
| Rate limiting fitur | cv-create 10/mnt, cv-upload 5/mnt, cv-file-pdf 10/mnt, dst. per route |
| CAPTCHA | Turnstile / reCAPTCHA v3 diverifikasi server-side di endpoint auth sensitif via header `x-captcha-token` (`lib/captcha.ts`) |
| Brute force | kombinasi rate limit ketat + CAPTCHA + email verification wajib (Better Auth) |
| CSRF (defense-in-depth) | `originCheck`: request write dengan `Origin` di luar allowlist → 403. Cookie session Better Auth `sameSite` + CORS credentials allowlist |
| XSS / injection | `sanitizeRequest`: strip karakter kontrol + tolak kunci `__proto__`/`constructor`/`prototype` (anti prototype pollution); validasi Zod di semua input; React auto-escaping di web |
| Security headers | helmet: CSP `default-src 'none'`, `frame-ancestors 'none'`, HSTS (production), `nosniff`, no-referrer; `x-powered-by` dimatikan |
| Upload | MIME allowlist (PDF/DOCX), cek **magic bytes** isi file, nama file disanitasi (anti path traversal), limit 5MB & 1 file |
| Download | `Content-Type` dari allowlist (bukan metadata mentah) + `nosniff` + `Content-Disposition: attachment` — anti HTML smuggling |
| Trust proxy | `TRUST_PROXY_HOPS` + `CF-Connecting-IP` agar rate limit membaca IP asli di belakang Cloudflare |
| Error handling | 404/error selalu JSON konsisten, tanpa stack trace / detail internal ke client |
| Secrets | Semua key (LLM, Gemini, R2, Resend) hanya di server; Gemini Live pakai ephemeral token |

### Web (Next.js)

- **CSP enforcing** di semua halaman: script eksternal hanya reCAPTCHA/Turnstile; `connect-src` dibatasi API + provider CAPTCHA + PostHog + Gemini Live; `frame-ancestors 'none'` (anti clickjacking); `object-src 'none'`.
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` (kamera/geolokasi mati, mic hanya self untuk mock interview), HSTS.
- `poweredByHeader: false`.

### Kebijakan fail-open

Rate limiter dan CAPTCHA **fail-open saat outage** (Redis/provider down → request tetap lolos, dicatat di log `warn`). Ini keputusan sadar agar availability tidak bergantung pada layanan pihak ketiga. Jika ingin fail-closed, ubah di `middleware/rateLimit.ts` dan `lib/captcha.ts`.

## 2. Mengaktifkan CAPTCHA

CAPTCHA nonaktif secara default (env kosong). Pilih salah satu:

**Cloudflare Turnstile (disarankan, gratis & tanpa tracking):**
1. Dashboard Cloudflare → Turnstile → Add site → mode *Managed* / *Invisible*.
2. Set `TURNSTILE_SECRET_KEY` (API) dan `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (web).

**Google reCAPTCHA v3:**
1. https://www.google.com/recaptcha/admin → daftarkan domain, tipe v3.
2. Set `RECAPTCHA_SECRET_KEY` (API) dan `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` (web). Atur ambang `CAPTCHA_MIN_SCORE` (default 0.5).

Token dikirim otomatis oleh form login/register via header `x-captcha-token` dan diverifikasi server-side.

## 3. Panduan Cloudflare (dilakukan di dashboard, bukan kode)

1. **DNS**: proxied (awan oranye) untuk domain web & API — IP origin tersembunyi.
2. **SSL/TLS**: mode **Full (Strict)** + Always Use HTTPS + Minimum TLS 1.2.
3. **WAF**: aktifkan *Managed Rules* (OWASP Core Ruleset) + **Bot Fight Mode**.
4. **Rate Limiting Rules** (lapisan edge, sebelum request sampai API):
   - `POST /api/auth/*` → mis. 20 req/menit per IP → Managed Challenge.
   - `/api/*` → mis. 300 req/menit per IP → Block 1 menit.
5. **Turnstile**: lihat bagian 2.
6. **R2**: bucket **private** (tanpa public access) — file hanya keluar lewat API yang sudah cek kepemilikan.
7. **Restrict origin**: firewall server API hanya menerima traffic dari [IP range Cloudflare](https://www.cloudflare.com/ips/), atau pakai Cloudflare Tunnel.
8. **TRUST_PROXY_HOPS**: sesuaikan jumlah hop (Cloudflare saja = 1; Cloudflare + LB = 2).
9. (Opsional) **HSTS preload** di Edge Certificates setelah yakin semua subdomain HTTPS.

## 4. Checklist Deploy Production

- [ ] `NODE_ENV=production`, `BETTER_AUTH_SECRET` acak ≥ 32 char (rotasi berkala)
- [ ] `CORS_ORIGIN` & `NEXT_PUBLIC_APP_URL` = domain production persis (bukan localhost)
- [ ] `TRUST_PROXY_HOPS` sesuai topologi proxy
- [ ] CAPTCHA keys terpasang (Turnstile/reCAPTCHA)
- [ ] Upstash Redis production (rate limit TIDAK boleh pakai MemoryRedis multi-instance)
- [ ] R2 bucket private, Gotenberg diberi basic auth
- [ ] Cloudflare: proxied DNS, Full (Strict), WAF, Bot Fight Mode, edge rate limiting
- [ ] Sentry DSN terpasang, review log 429/403 minggu pertama

## 5. Melaporkan Celah

Kirim laporan ke email maintainer repository. Mohon jangan membuka issue publik untuk kerentanan yang belum diperbaiki.
