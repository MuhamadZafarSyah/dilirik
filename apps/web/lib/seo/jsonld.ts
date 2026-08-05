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
 * Deskripsi produk + harga.
 */
export function softwareApplicationJsonLd(): JsonLdObject {
	return compact({
		"@context": "https://schema.org",
		"@type": "SoftwareApplication",
		name: siteName,
		url: siteUrl,
		applicationCategory: "BusinessApplication",
		operatingSystem: "Web Browser",
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

/**
 * FAQPage Schema untuk hasil pencarian Google (Rich Snippet Accordion).
 */
export function faqJsonLd(): JsonLdObject {
	const faqs = [
		{
			q: "Apa itu Dilirik?",
			a: "Dilirik (dilirik.tech) adalah platform AI analisis kecocokan CV ATS dan pembuat surat lamaran kerja (cover letter) otomatis yang disesuaikan khusus dengan kualifikasi lowongan kerja.",
		},
		{
			q: "Apakah layanan analisis CV di Dilirik gratis?",
			a: "Ya, Dilirik menyediakan kuota analisis CV dan pembuatan surat lamaran AI secara gratis setiap bulannya tanpa memerlukan kartu kredit.",
		},
		{
			q: "Bagaimana cara kerja analisis kecocokan CV ATS di Dilirik?",
			a: "Dilirik membandingkan teks CV Anda dengan deskripsi pekerjaan yang ditargetkan, mengidentifikasi kata kunci yang hilang (gap analysis), dan memberikan saran konkret tanpa mengarang data.",
		},
		{
			q: "Apakah Dilirik mendukung format CV PDF dan Word?",
			a: "Ya, Anda bisa mengunggah file CV berformat PDF atau DOCX. Dilirik akan mengekstrak teksnya dan melakukan analisis kecocokan secara instan.",
		},
	]

	return compact({
		"@context": "https://schema.org",
		"@type": "FAQPage",
		mainEntity: faqs.map((faq) => ({
			"@type": "Question",
			name: faq.q,
			acceptedAnswer: {
				"@type": "Answer",
				text: faq.a,
			},
		})),
	})
}
