import type { MetadataRoute } from "next";
import { JOB_ROLES_SEO_DATA } from "./seo-data";
import { absoluteUrl } from "@/lib/site";

export type SitemapEntry = MetadataRoute.Sitemap[number];

type ChangeFrequency = NonNullable<SitemapEntry["changeFrequency"]>;

export type StaticRoute = {
  path: string;
  priority: number;
  changeFrequency: ChangeFrequency;
};

/**
 * Rute statis yang boleh diindeks.
 */
export const staticRoutes: readonly StaticRoute[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/pricing", priority: 0.8, changeFrequency: "monthly" },
  { path: "/legal/privacy", priority: 0.3, changeFrequency: "yearly" },
  { path: "/legal/terms", priority: 0.3, changeFrequency: "yearly" },
];

/**
 * Rute artikel blog.
 */
export async function getBlogRoutes(): Promise<SitemapEntry[]> {
  return [];
}

/**
 * Rute programatik (`/contoh-surat-lamaran/[slug]`, `/contoh-cv/[slug]`).
 */
export async function getProgrammaticRoutes(): Promise<SitemapEntry[]> {
  const lastModified = new Date();
  const slugs = Object.keys(JOB_ROLES_SEO_DATA);

  const routes: SitemapEntry[] = [];

  for (const slug of slugs) {
    routes.push({
      url: absoluteUrl(`/contoh-surat-lamaran/${slug}`),
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    });
    routes.push({
      url: absoluteUrl(`/contoh-cv/${slug}`),
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  return routes;
}
