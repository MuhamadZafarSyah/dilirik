import type { JsonLdObject } from "@/lib/seo/jsonld"

type JsonLdProps = {
	data: JsonLdObject | JsonLdObject[]
}

/**
 * Menyisipkan structured data sebagai `<script type="application/ld+json">`.
 *
 * `<` di-escape menjadi `\u003c` agar payload tidak bisa menutup tag script
 * lebih awal (vektor XSS klasik pada JSON-LD).
 * Skrip ld+json tidak dieksekusi browser, jadi tidak memerlukan pelonggaran CSP.
 */
export function JsonLd({ data }: JsonLdProps) {
	const payload = JSON.stringify(data).replace(/</g, "\\u003c")

	return (
		<script
			type="application/ld+json"
			dangerouslySetInnerHTML={{ __html: payload }}
		/>
	)
}
