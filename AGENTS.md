# AGENTS.md — Dilirik

## Monorepo structure

```
apps/web     → Next.js 15 (App Router) + React 19 + Tailwind v4
apps/api     → Express 4 + TypeScript (Better Auth, Prisma, Redis)
packages/
  shared     → Zod schemas & constants (kontrak web↔api)
  db         → Prisma schema + client (Neon Postgres)
  ai         → LLM client, scoring, gap analysis, guardrail 3-titik
```

## Commands

| Command | What |
|---------|------|
| `pnpm dev` | Jalankan web (3000) + api (4000) via turbo |
| `pnpm build` | Build semua workspace (turbo) |
| `pnpm test` | Vitest di semua package |
| `pnpm typecheck` | `tsc --noEmit` semua workspace |
| `pnpm lint` | ESLint semua workspace |
| `pnpm e2e` | Playwright (web only) |
| `pnpm db:push` | `prisma db push` (sinkron schema ke Neon) |
| `pnpm db:studio` | `prisma studio` |
| `pnpm format` | Prettier all `{ts,tsx,md,json,css}` |

**Order:** `pnpm lint` → `pnpm typecheck` → `pnpm test` (typecheck depends on build).

## Environment gotchas

- **`.env` hanya di root proyek.** API pakai `--env-file=../../.env` di dev script. **Next.js tidak auto-load** env dari root → perlu `cp .env apps/web/.env` atau set manual `NEXT_PUBLIC_*`.
- **LLM_API_KEY="" (string kosong) akan throw.** `getLlm()` cek `!apiKey` — string kosong itu falsy. Set key valid atau refactor `createCv`/`createJob` untuk fallback graceful.
- **Redis fallback in-memory** saat `UPSTASH_REDIS_REST_URL` tidak di-set. Aman untuk dev.
- **R2 storage return null** saat R2 env kosong. File tidak tersimpan di cloud, tapi teks tetap diproses.
- **Resend** `MAIL_FROM` default `no-reply@dilirik.app`. Testing cukup pakai `onboarding@resend.dev` + daftarkan email di Authorized Recipients dashboard Resend.

## Framework quirks

- **Tailwind v4 CSS-first.** TIDAK ada `tailwind.config.ts`. Semua token di `apps/web/app/globals.css` via `@theme`. Konfigurasi PostCSS minimal (`@tailwindcss/postcss` saja).
- **Better Auth handler HARUS sebelum `express.json()`** di `app.ts:28`. Urutan: helmet → cors → pino → `/api/auth/*` → express.json → routes.
- **Better Auth + rate limit** butuh Redis. Rate limit `rateLimit(bucket, max, windowSeconds)` di middleware — fallback memory redis ok untuk dev.
- **Error handler terpusat** di `middleware/errorHandler.ts`. Semua route pakai `catch (e) { next(e) }`. HttpError(code, message) untuk error 4xx, selebihnya 500.
- **Prisma** di `packages/db/prisma/schema.prisma`. Migrasi via `db:migrate`, sync langsung via `db:push`.
- **Guardrail 3-titik AI** (kejujuran): (1) system prompt anti-mengarang → (2) validasi Zod → (3) post-check fakta di `packages/ai/src/guardrail/`.
- **Analysis cache** via `hash(cv+job+engineVersion)` di Redis. Key unik `cacheKey` di tabel Analysis.
- **Deteksi bahasa** `detectLanguage()` di API — heuristik stopword (ID/EN), tanpa biaya LLM.

## Architecture notes

- **Auth:** Better Auth (email/password + Google + GitHub). Session cookie name `better-auth.session_token`. Middleware Next.js redirect `/app/*` → `/login` kalau cookie hilang (lapisan UX cepat).
- **Quota:** Field `analysisQuota` (default 10) + `analysisUsedThisPeriod` di User model. Reset periodik via `quotaResetAt`. Check di `@dilirik/ai` pipeline.
- **API routes:** `/api/cv/*`, `/api/jobs/*`, `/api/applications/*`, `/api/analyze/*`, `/api/dashboard/*`, `/api/settings/*`. Semua via `requireAuth`.
- **CSS scrapbook style.** Class utility: `.hand`, `.scrawl`, `.label`, `.card`, `.polaroid`, `.paper-texture`, `.tape*`, `.sticky-note`. Dark mode via class `.dark`.

## Testing

- **Web:** Vitest + jsdom, test files di `apps/web/test/`. Setup file tersedia.
- **API:** Vitest + node, test files di `apps/api/test/`. Env stub via vitest config.
- **E2E:** Playwright di `apps/web/e2e/` (jalankan via `pnpm e2e`).
- **AI package:** Testing via Vitest di `packages/ai/`.

## API error responses

Semua error response konsisten `{ error: string, message: string }`.
- `HttpError(status, code, message)` → `{ error: code, message }`
- `ZodError` → `{ error: "VALIDATION_ERROR", message: "..." }` (400)
- Unhandled → `{ error: "INTERNAL", message: "Terjadi kesalahan internal" }` (500)
