import { FaqAccordion } from "@/components/landing/faq-accordion"
import { FeatureGrid } from "@/components/landing/feature-grid"
import { FinalCta } from "@/components/landing/final-cta"
import { Hero } from "@/components/landing/hero"
import { HonestyCompare } from "@/components/landing/honesty-compare"
import { ProductDemo } from "@/components/landing/product-demo"
import { ProductFacts } from "@/components/landing/product-facts"
import { SiteFooter } from "@/components/landing/site-footer"
import { SiteHeader } from "@/components/landing/site-header"
import { SmoothScroll } from "@/components/landing/smooth-scroll"
import { JsonLd } from "@/components/seo/json-ld"
import { faqs } from "@/lib/landing/faqs"
import { faqPageJsonLd } from "@/lib/seo/jsonld"

/**
 * Landing page.
 *
 * Berbeda dari versi sebelumnya, berkas ini bukan lagi satu komponen klien
 * 43 KB. Halaman dirender di server, dan hanya tiga bagian yang benar-benar
 * butuh status dijadikan client leaf: peraga hasil, akordeon FAQ, dan scroll
 * halus. Sisanya HTML statis, yang berarti lebih sedikit JavaScript yang harus
 * diunduh sebelum halaman bisa dibaca.
 */
export default function LandingPage() {
  return (
    <>
      <SmoothScroll />
      <div className="paper-texture min-h-screen text-ink">
        <SiteHeader />
        <main>
          <Hero />
          <ProductDemo />
          <FeatureGrid />
          <HonestyCompare />
          <ProductFacts />
          <FaqAccordion />
          <FinalCta />
        </main>
        <SiteFooter />
      </div>
      <JsonLd data={faqPageJsonLd(faqs)} />
    </>
  )
}
