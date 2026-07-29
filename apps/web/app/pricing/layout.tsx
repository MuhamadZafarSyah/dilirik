import type { Metadata } from "next"
import type { ReactNode } from "react"
import { JsonLd } from "@/components/seo/json-ld"
import { softwareApplicationJsonLd } from "@/lib/seo/jsonld"

const title = "Harga — Mulai Gratis, Tanpa Kartu Kredit"
const description =
  "Selama beta semua fitur Dilirik gratis: 10 analisis kecocokan CV per bulan, simpan CV & lowongan tanpa batas, dan tracker lamaran."

/**
 * Metadata `/pricing` tinggal di layout, bukan di `page.tsx`, karena halaman
 * harga adalah client component (`"use client"`) dan client component tidak
 * boleh mengekspor `metadata`. Ini pola resmi Next.js, bukan akal-akalan.
 */
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/pricing" },
  openGraph: {
    title,
    description,
    url: "/pricing",
  },
}

export default function PricingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <JsonLd data={softwareApplicationJsonLd()} />
    </>
  )
}
