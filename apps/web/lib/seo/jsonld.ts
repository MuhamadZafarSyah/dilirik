import {
	absoluteUrl,
	defaultDescription,
	defaultLanguage,
	logoPath,
	siteName,
	siteUrl,
	socialProfiles,
} from "@/lib/site"

/**
 * Builder JSON-LD murni — tidak ada JSX di berkas ini, sehingga bisa diuji unit
 * tanpa merender React. Komponen penyaji ada di `components/seo/json-ld.tsx`.
 *
 * Setiap builder memakai `@id` stabil supaya entitas bisa saling merujuk
 * (Organization <- WebSite <- SoftwareApplication) alih-alih menduplikasi data.
 */
export type JsonLdObject = Record<string, unknown>

const ORGANIZATION_ID = `${siteUrl}/#organization`
const WEBSITE_ID = `${siteUrl}/#website`

/** Membuang properti kosong agar JSON-LD tidak memuat field bernilai kosong. */
function compact(input: JsonLdObject): JsonLdObject {
	return Object.fromEntries(
		Object.entries(input).filter(([, value]) => {
			if (value === undefined || value === null) return false
			if (Array.isArray(value)) return value.length > 0
			return true
		}),
	)
}

export function organizationJsonLd(): JsonLdObject {
	return compact({
		"@context": "https://schema.org",
		"@type": "Organization",
		"@id": ORGANIZATION_ID,
		name: siteName,
		url: siteUrl,
		logo: absoluteUrl(logoPath),
		description: defaultDescription,
		// Kosong selama akun sosial belum dibuat; `compact` akan menghapusnya.
		sameAs: [...socialProfiles],
	})
}

export function webSiteJsonLd(): JsonLdObject {
	return compact({
		"@context": "https://schema.org",
		"@type": "WebSite",
		"@id": WEBSITE_ID,
		name: siteName,
		url: siteUrl,
		inLanguage: defaultLanguage,
		publisher: { "@id": ORGANIZATION_ID },
	})
}

/**
 * Deskripsi produk + harga. Ditempel di `/pricing` karena di sanalah harga
 * ditampilkan; nominalnya WAJIB sama dengan yang terlihat pengguna (Rp0 selama
 * beta), kalau tidak Google menandainya sebagai structured data menyesatkan.
 */
export function softwareApplicationJsonLd(): JsonLdObject {
	return compact({
		"@context": "https://schema.org",
		"@type": "SoftwareApplication",
		name: siteName,
		url: siteUrl,
		applicationCategory: "BusinessApplication",
		operatingSystem: "Web",
		description: defaultDescription,
		inLanguage: defaultLanguage,
		publisher: { "@id": ORGANIZATION_ID },
		offers: {
			"@type": "Offer",
			price: "0",
			priceCurrency: "IDR",
			url: absoluteUrl("/pricing"),
			availability: "https://schema.org/InStock",
		},
	})
}
