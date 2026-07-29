import type { MetadataRoute } from "next"

export type SitemapEntry = MetadataRoute.Sitemap[number]

type ChangeFrequency = NonNullable<SitemapEntry["changeFrequency"]>

export type StaticRoute = {
	path: string
	priority: number
	changeFrequency: ChangeFrequency
}

/**
 * Rute statis yang boleh diindeks.
 *
 * Catatan: `/legal/terms` BELUM ada di aplikasi (hanya `/legal/privacy`).
 * Jangan didaftarkan di sini sebelum halamannya benar-benar dibuat — URL 404 di
 * sitemap menurunkan kepercayaan crawler terhadap seluruh sitemap.
 */
export const staticRoutes: readonly StaticRoute[] = [
	{ path: "/", priority: 1, changeFrequency: "weekly" },
	{ path: "/pricing", priority: 0.8, changeFrequency: "monthly" },
	{ path: "/legal/privacy", priority: 0.3, changeFrequency: "yearly" },
]

/**
 * Rute artikel blog. Masih kosong karena Fase 3 ditunda (K10).
 * Sengaja dibuat async agar nanti bisa membaca berkas MDX tanpa mengubah
 * `app/sitemap.ts` sama sekali.
 */
export async function getBlogRoutes(): Promise<SitemapEntry[]> {
	return []
}

/**
 * Rute programatik (`/contoh-cv/[posisi]`, dll). Masih kosong karena Fase 3
 * ditunda (K10). Titik sambung yang sama seperti `getBlogRoutes`.
 */
export async function getProgrammaticRoutes(): Promise<SitemapEntry[]> {
	return []
}
