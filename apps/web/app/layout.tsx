import type { Metadata, Viewport } from "next"
import { Caveat, Gochi_Hand, Inter } from "next/font/google"
import { AnalyticsProvider } from "@/components/analytics/analytics-provider"
import { JsonLd } from "@/components/seo/json-ld"
import { organizationJsonLd, webSiteJsonLd } from "@/lib/seo/jsonld"
import {
  defaultDescription,
  defaultLocale,
  defaultTitle,
  ogImagePath,
  siteName,
  siteUrl,
  titleTemplate,
  twitterHandle,
} from "@/lib/site"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap", preload: true });
const gochi = Gochi_Hand({ subsets: ["latin"], weight: "400", variable: "--font-gochi", display: "swap", preload: true, adjustFontFallback: false });
const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat", display: "swap", preload: true, adjustFontFallback: false });

/**
 * Metadata dasar seluruh situs.
 *
 * `metadataBase` wajib ada: tanpa itu Next.js tidak bisa mengubah path relatif
 * (`/og-image.png`, `alternates.canonical`) menjadi URL absolut, dan tag
 * Open Graph akan diabaikan oleh crawler.
 */
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: defaultTitle,
    template: titleTemplate,
  },
  description: defaultDescription,
  applicationName: siteName,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: defaultLocale,
    url: "/",
    siteName,
    title: defaultTitle,
    description: defaultDescription,
    images: [{ url: ogImagePath, width: 1200, height: 630, alt: siteName }],
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: defaultDescription,
    images: [ogImagePath],
    site: twitterHandle ? `@${twitterHandle}` : undefined,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  themeColor: "#f2e8d5",
  colorScheme: "light",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning className={`${inter.variable} ${gochi.variable} ${caveat.variable}`}>
      <body
        className={`${inter.variable} ${gochi.variable} ${caveat.variable} bg-paper text-ink font-sans paper-texture min-h-screen antialiased`}
      >
        {children}
        <JsonLd data={[organizationJsonLd(), webSiteJsonLd()]} />
        <AnalyticsProvider />
      </body>
    </html>
  )
}
