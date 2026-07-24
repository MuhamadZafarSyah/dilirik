import type { Metadata } from "next"
import { Caveat, Gochi_Hand, Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
});

const gochi = Gochi_Hand({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-gochi",
  display: "swap",
  preload: true,
  adjustFontFallback: false,
});

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
  display: "swap",
  preload: true,
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "Dilirik — Bikin CV-mu dilirik.",
  description:
    "Cocokkan CV dengan lowongan: skor kecocokan, analisis gap, dan saran perbaikan yang jujur — tanpa mengarang.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning className={`${inter.variable} ${gochi.variable} ${caveat.variable}`}>
      <body
        className={`${inter.variable} ${gochi.variable} ${caveat.variable} bg-paper text-ink font-sans paper-texture min-h-screen antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
