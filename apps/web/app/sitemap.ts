import type { MetadataRoute } from "next"
import {
	getBlogRoutes,
	getProgrammaticRoutes,
	staticRoutes,
} from "@/lib/seo/routes"
import { absoluteUrl } from "@/lib/site"

/**
 * Generator sitemap. Berkas ini sengaja tipis: daftar rutenya ada di
 * `lib/seo/routes.ts`, jadi menambah blog atau halaman programatik di Fase 3
 * tidak menyentuh berkas ini sama sekali.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const lastModified = new Date()

	const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
		url: absoluteUrl(route.path),
		lastModified,
		changeFrequency: route.changeFrequency,
		priority: route.priority,
	}))

	const [blogEntries, programmaticEntries] = await Promise.all([
		getBlogRoutes(),
		getProgrammaticRoutes(),
	])

	return [...staticEntries, ...blogEntries, ...programmaticEntries]
}
