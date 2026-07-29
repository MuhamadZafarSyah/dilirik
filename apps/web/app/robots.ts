import type { MetadataRoute } from "next"
import { absoluteUrl } from "@/lib/site"

/**
 * Area privat/transaksional yang tidak berguna di hasil pencarian.
 * `/api/` ikut ditutup karena rute auth Better Auth diproksikan lewat sana.
 */
const disallowedPaths = [
	"/app/",
	"/api/",
	"/login",
	"/register",
	"/reset-password",
	"/verify-email",
]

/**
 * Crawler AI (GPTBot, ClaudeBot, PerplexityBot, dll) SENGAJA tidak diblokir —
 * keputusan K4: kutipan di jawaban AI adalah kanal akuisisi, bukan ancaman.
 * Karena itu cukup satu aturan `*`; tidak ada blok per-bot.
 */
export default function robots(): MetadataRoute.Robots {
	return {
		rules: [
			{
				userAgent: "*",
				allow: "/",
				disallow: disallowedPaths,
			},
		],
		sitemap: absoluteUrl("/sitemap.xml"),
	}
}
