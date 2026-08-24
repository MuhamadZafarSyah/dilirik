import type { AtsCompanyRef } from "./providers/types.js"

/**
 * Seed daftar kurasi "Direkomendasikan Dilirik" (PRD Cari Lowongan §7.2).
 *
 * Ini SEED, bukan daftar final. Target M1 adalah ~300 perusahaan; yang di bawah
 * dipakai untuk memulai indeks dan membuktikan pipeline ingestion jalan. Slug ATS
 * bisa berubah kapan saja (perusahaan pindah ATS, board ditutup), karena itu
 * `CuratedCompany.failCount` di database yang menonaktifkan entri mati secara
 * otomatis — daftar ini tidak perlu sempurna untuk aman.
 *
 * Cara menambah: cari halaman karier perusahaan, lihat domain board-nya.
 *   boards.greenhouse.io/<slug>   → greenhouse
 *   jobs.lever.co/<slug>          → lever
 *   jobs.ashbyhq.com/<slug>       → ashby
 *   apply.workable.com/<slug>     → workable
 *   <slug>.recruitee.com          → recruitee
 */

export const CURATED_COMPANIES_SEED: Array<AtsCompanyRef & { region: string }> = [
  // ===== Tech Indonesia & SEA =====
  { name: "Xendit", atsProvider: "greenhouse", atsSlug: "xendit", region: "ID" },
  { name: "Ajaib", atsProvider: "greenhouse", atsSlug: "ajaib", region: "ID" },
  { name: "Kredivo", atsProvider: "greenhouse", atsSlug: "kredivogroup", region: "ID" },
  { name: "Flip", atsProvider: "greenhouse", atsSlug: "flip", region: "ID" },
  { name: "Sleekflow", atsProvider: "ashby", atsSlug: "sleekflow", region: "SEA" },
  { name: "Coda Payments", atsProvider: "greenhouse", atsSlug: "codapayments", region: "SEA" },
  { name: "Ninja Van", atsProvider: "greenhouse", atsSlug: "ninjavan", region: "SEA" },
  { name: "Carro", atsProvider: "greenhouse", atsSlug: "carro", region: "SEA" },
  { name: "Aspire", atsProvider: "greenhouse", atsSlug: "aspireapp", region: "SEA" },
  { name: "Nium", atsProvider: "greenhouse", atsSlug: "nium", region: "SEA" },
  { name: "Endowus", atsProvider: "lever", atsSlug: "endowus", region: "SEA" },
  { name: "Bolttech", atsProvider: "workable", atsSlug: "bolttech", region: "SEA" },

  // ===== Remote-friendly global (banyak lowongan APAC/remote) =====
  { name: "Automattic", atsProvider: "greenhouse", atsSlug: "automattic", region: "REMOTE" },
  { name: "GitLab", atsProvider: "greenhouse", atsSlug: "gitlab", region: "REMOTE" },
  { name: "Canonical", atsProvider: "greenhouse", atsSlug: "canonical", region: "REMOTE" },
  { name: "Grafana Labs", atsProvider: "greenhouse", atsSlug: "grafanalabs", region: "REMOTE" },
  { name: "Deel", atsProvider: "ashby", atsSlug: "deel", region: "REMOTE" },
  { name: "Supabase", atsProvider: "ashby", atsSlug: "supabase", region: "REMOTE" },
  { name: "Vercel", atsProvider: "ashby", atsSlug: "vercel", region: "REMOTE" },
  { name: "Ramp", atsProvider: "ashby", atsSlug: "ramp", region: "REMOTE" },
  { name: "Linear", atsProvider: "ashby", atsSlug: "linear", region: "REMOTE" },
  { name: "Toggl", atsProvider: "recruitee", atsSlug: "toggl", region: "REMOTE" },
  { name: "Doist", atsProvider: "workable", atsSlug: "doist", region: "REMOTE" },
  { name: "Netlify", atsProvider: "greenhouse", atsSlug: "netlify", region: "REMOTE" },
  { name: "Sourcegraph", atsProvider: "greenhouse", atsSlug: "sourcegraph", region: "REMOTE" },
  { name: "Shopify", atsProvider: "greenhouse", atsSlug: "shopify", region: "REMOTE" },
  { name: "Cloudflare", atsProvider: "greenhouse", atsSlug: "cloudflare", region: "REMOTE" },
  { name: "Datadog", atsProvider: "greenhouse", atsSlug: "datadog", region: "REMOTE" },
  { name: "Airbyte", atsProvider: "greenhouse", atsSlug: "airbyte", region: "REMOTE" },
  { name: "Mercury", atsProvider: "lever", atsSlug: "mercury", region: "REMOTE" },
  { name: "Voodoo", atsProvider: "lever", atsSlug: "voodoo", region: "REMOTE" },
  { name: "Binance", atsProvider: "lever", atsSlug: "binance", region: "REMOTE" },
  { name: "Bitget", atsProvider: "lever", atsSlug: "bitget", region: "REMOTE" },
  { name: "Veeva", atsProvider: "lever", atsSlug: "veeva", region: "REMOTE" },
]

/** Perusahaan yang boleh ditarik pada satu ingestion run, dibatasi jumlahnya. */
export function seedForProvider(provider: string): AtsCompanyRef[] {
  return CURATED_COMPANIES_SEED.filter((company) => company.atsProvider === provider).map(
    ({ name, atsProvider, atsSlug }) => ({ name, atsProvider, atsSlug }),
  )
}
