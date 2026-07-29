/**
 * Sumber kebenaran tunggal untuk identitas situs (URL kanonik, nama, deskripsi,
 * aset sosial). Dipakai oleh metadata Next.js, robots.txt, sitemap.xml, dan JSON-LD.
 *
 * Kenapa memakai `NEXT_PUBLIC_APP_URL` dan bukan env baru:
 * env ini sudah ada di repo dan sudah menjadi acuan `trustedOrigins` Better Auth,
 * link verifikasi email, serta CORS di API. Menambah env kedua yang artinya sama
 * (`NEXT_PUBLIC_SITE_URL`) hanya akan menciptakan dua sumber kebenaran yang bisa
 * saling bertentangan tanpa error.
 *
 * PENTING: seluruh env `NEXT_PUBLIC_*` di-inline saat build. Mengubahnya di
 * dashboard hosting TIDAK berpengaruh sampai ada redeploy.
 */

const FALLBACK_SITE_URL = "https://dilirik.tech"

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0"])

/**
 * Menormalkan URL mentah dari env menjadi origin kanonik:
 * - menambahkan skema bila hilang (`dilirik.tech` -> `https://dilirik.tech`)
 * - memaksa https dan membuang prefix `www.` (kanonik = apex, lihat K1)
 * - membuang path, query, hash, dan trailing slash
 * - membiarkan host lokal apa adanya agar `pnpm dev` tetap berjalan
 */
function normalizeSiteUrl(raw: string | undefined): string {
	const candidate = raw?.trim()
	if (!candidate) return FALLBACK_SITE_URL

	let url: URL
	try {
		url = new URL(candidate.includes("://") ? candidate : `https://${candidate}`)
	} catch {
		return FALLBACK_SITE_URL
	}

	if (!LOCAL_HOSTNAMES.has(url.hostname)) {
		url.protocol = "https:"
		url.hostname = url.hostname.replace(/^www\./i, "")
	}

	return url.origin
}

/** Origin kanonik tanpa trailing slash, mis. `https://dilirik.tech`. */
export const siteUrl = normalizeSiteUrl(process.env.NEXT_PUBLIC_APP_URL)

export const siteName = "Dilirik"

/** Judul default halaman utama. Ditahan <= 60 karakter agar tidak terpotong di SERP. */
export const defaultTitle = "Dilirik — Cek Kecocokan CV dengan Lowongan, Gratis"

/** Template judul untuk halaman turunan, mis. "Harga — Dilirik". */
export const titleTemplate = `%s — ${siteName}`

/** Deskripsi default. Ditahan <= 155 karakter agar utuh di SERP. */
export const defaultDescription =
	"Cocokkan CV dengan lowongan kerja: skor kecocokan, analisis gap, dan saran perbaikan yang jujur — tanpa mengarang. Gratis, tanpa kartu kredit."

export const defaultLocale = "id_ID"
export const defaultLanguage = "id-ID"

/** Aset Open Graph 1200x630. Lihat `public/README.md` untuk kontrak berkasnya. */
export const ogImagePath = "/og-image.png"
export const logoPath = "/icon.png"

/**
 * Profil sosial resmi untuk `sameAs` di JSON-LD.
 * Sengaja kosong: akun `dilirik.tech` (Instagram, Threads, X) belum dibuat, dan
 * menautkan URL yang belum ada lebih merugikan daripada tidak menautkan apa pun.
 * Cukup isi array ini saat akunnya siap — JSON-LD ikut menyesuaikan otomatis.
 */
export const socialProfiles: readonly string[] = []

/** Handle Twitter/X tanpa `@`. Biarkan `undefined` sampai akunnya ada. */
export const twitterHandle: string | undefined = undefined

/** Mengubah path relatif menjadi URL absolut. URL absolut diteruskan apa adanya. */
export function absoluteUrl(path: string = "/"): string {
	if (/^https?:\/\//i.test(path)) return path
	return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`
}
