# Dilirik — "Bikin CV-mu dilirik."

SaaS web app berbasis AI: cocokkan CV dengan lowongan spesifik → skor 0–100, analisis gap (gap beneran vs gap penyajian), dan saran tulis ulang **jujur** (tanpa mengarang), plus tracker lamaran.

## Monorepo

```
apps/
  web   → Next.js (App Router) + Tailwind v4 (CSS-first, TANPA tailwind.config.ts) + shadcn-style components
  api   → Express + TypeScript (Better Auth, Prisma, Redis, mesin analisis)
packages/
  shared → Tipe & Zod schema bersama (kontrak web ↔ api)
  db     → Prisma schema + client (Neon Postgres)
  ai     → Mesin analisis: LLM client provider-agnostic, scoring, gap, saran, guardrail 3-titik
  tsconfig / eslint-config → tooling bersama
```

## Setup

1. `pnpm install`
2. Salin `.env.example` → `.env` (root) dan isi kredensial (Neon, Upstash, OAuth, LLM, R2, Resend).
3. `pnpm db:push` (sinkron skema ke Neon dev) — atau `pnpm db:migrate` untuk migrasi.
4. `pnpm dev` → web di `http://localhost:3000`, api di `http://localhost:4000`.

## Perintah

| Perintah | Fungsi |
| --- | --- |
| `pnpm dev` | Jalankan web + api (turbo) |
| `pnpm build` | Build semua workspace |
| `pnpm test` | Unit/integration test (Vitest) |
| `pnpm e2e` | Playwright E2E (flow A–E PRD §11) |
| `pnpm typecheck` / `pnpm lint` | Kualitas kode |

## Prinsip inti

1. **Jujur di atas segalanya** — guardrail 3-titik: system prompt anti-mengarang → validasi Zod → post-check fakta (`packages/ai/src/guardrail`).
2. **Cost-aware AI** — cache `hash(cv+job+engineVersion)` di Redis, rate limit, kuota `analysisQuota` (default 10/bulan, null = unlimited).
3. **Testable** — Vitest + RTL + Supertest + Playwright + MSW.
4. **Ship full end-to-end** — semua fitur MVP dalam satu rilis. Billing ditunda (semua gratis).

## Deploy

Lihat `docs/DEPLOY.md` (Vercel untuk web, Railway/Docker untuk api, Neon prod, runbook rollback).
