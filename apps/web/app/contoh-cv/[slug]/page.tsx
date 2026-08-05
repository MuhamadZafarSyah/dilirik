import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { FiArrowLeft, FiCheckCircle, FiFileText, FiZap, FiSearch } from "react-icons/fi"
import { JOB_ROLES_SEO_DATA } from "@/lib/seo/seo-data"
import { absoluteUrl, siteName } from "@/lib/site"
import { JsonLd } from "@/components/seo/json-ld"

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return Object.keys(JOB_ROLES_SEO_DATA).map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params
  const data = JOB_ROLES_SEO_DATA[resolvedParams.slug]
  if (!data) return {}

  const url = absoluteUrl(`/contoh-cv/${data.slug}`)
  const title = `Panduan CV ATS ${data.title} & Contoh Kata Kunci | Dilirik`
  const description = `Panduan lengkap penyusunan CV ATS ${data.title} lolos seleksi kerja, beserta daftar kata kunci utama dan tips optimasi gratis.`

  return {
    title,
    description,
    keywords: [
      `Contoh CV ${data.title}`,
      `CV ATS ${data.title}`,
      `Panduan CV ATS ${data.title}`,
      ...data.keywords,
    ],
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      siteName,
    },
  }
}

export default async function ContohCvPage({ params }: Props) {
  const resolvedParams = await params
  const data = JOB_ROLES_SEO_DATA[resolvedParams.slug]

  if (!data) {
    notFound()
  }

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Beranda",
        item: absoluteUrl("/"),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: `Panduan CV ATS ${data.title}`,
        item: absoluteUrl(`/contoh-cv/${data.slug}`),
      },
    ],
  }

  return (
    <main className="min-h-screen bg-paper text-ink p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      <JsonLd data={[breadcrumbJsonLd]} />

      {/* Navigation */}
      <div>
        <Link
          href="/"
          className="label text-muted hover:text-ink inline-flex items-center gap-2 text-xs font-bold"
        >
          <FiArrowLeft /> Beranda Dilirik
        </Link>
      </div>

      {/* Header */}
      <header className="space-y-3 border-b-2 border-line pb-6">
        <span className="text-xs font-bold uppercase tracking-wider bg-panel border border-line px-3 py-1 rounded-md">
          {data.category}
        </span>
        <h1 className="hand text-3xl sm:text-4xl md:text-5xl font-bold text-ink">
          Panduan & Contoh CV ATS {data.title}
        </h1>
        <p className="text-muted text-sm sm:text-base leading-relaxed">
          Pelajari cara menyusun resume atau CV ATS friendly untuk posisi {data.title}. Sertakan kata kunci relevan agar resume Anda lolos pemindaian otomatis rekruter.
        </p>
      </header>

      {/* CTA Box */}
      <div className="bg-green/20 border-2 border-line rounded-2xl p-5 md:p-6 shadow-paper space-y-4">
        <div className="flex items-center gap-3">
          <div className="bg-green/40 border-2 border-line p-2 rounded-xl text-xl shadow-xs">
            📊
          </div>
          <div>
            <h2 className="hand text-xl font-bold text-ink">Sudah Punya CV? Cek Skor Kecocokannya Sekarang!</h2>
            <p className="text-xs text-muted">
              Unggah CV Anda di Dilirik dan dapatkan analisis gap kata kunci ATS serta rekomendasi perbaikan instan secara gratis.
            </p>
          </div>
        </div>
        <Link
          href="/login"
          className="label bg-ink text-paper hover:bg-ink/90 border-2 border-ink px-5 py-2.5 rounded-xl font-bold text-xs inline-flex items-center gap-2 shadow-paper"
        >
          <FiSearch /> Cek Kecocokan CV Saya Gratis
        </Link>
      </div>

      {/* Recommended Keywords Section */}
      <section className="space-y-4 bg-panel border-2 border-line p-6 rounded-2xl shadow-paper">
        <h2 className="hand text-2xl font-bold text-ink">
          Kata Kunci Wajib (ATS Keywords) - {data.title}
        </h2>
        <p className="text-xs text-muted">
          Sistem ATS mencari kata kunci keahlian dan alat kerja berikut dalam CV Anda:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {data.atsKeywords.map((kw) => (
            <div key={kw} className="bg-paper border border-line p-3 rounded-xl font-bold text-xs text-ink flex items-center justify-between shadow-xs">
              <span>{kw}</span>
              <span className="text-[10px] text-muted uppercase bg-panel px-2 py-0.5 rounded border border-line">Sangat Penting</span>
            </div>
          ))}
        </div>
      </section>

      {/* Key Tips */}
      <section className="space-y-4">
        <h2 className="hand text-2xl font-bold text-ink">
          3 Strategi Menyusun CV {data.title} Lolos ATS
        </h2>
        <div className="space-y-3">
          {data.cvTips.map((tip, idx) => (
            <div key={idx} className="bg-paper border-2 border-line p-4 rounded-xl space-y-1 shadow-paper">
              <h3 className="font-bold text-sm text-ink flex items-center gap-2">
                <span className="bg-yellow border border-line px-2 py-0.5 rounded text-xs">Poin {idx + 1}</span>
              </h3>
              <p className="text-xs md:text-sm text-muted leading-relaxed">{tip}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Internal Cross-link */}
      <section className="bg-paper border-2 border-line p-6 rounded-2xl shadow-paper flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="hand text-xl font-bold text-ink">Butuh Surat Lamaran untuk {data.title}?</h3>
          <p className="text-xs text-muted">Lihat contoh draf surat lamaran kerja khusus posisi ini.</p>
        </div>
        <Link
          href={`/contoh-surat-lamaran/${data.slug}`}
          className="label bg-yellow hover:bg-yellow/90 border-2 border-line px-4 py-2 rounded-xl text-xs font-bold shadow-xs shrink-0"
        >
          Lihat Contoh Surat Lamaran →
        </Link>
      </section>

      {/* Footer Navigation */}
      <footer className="pt-8 border-t-2 border-line flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold text-muted">
        <span>© {new Date().getFullYear()} Dilirik (dilirik.tech) — Platform Analisis CV & Surat Lamaran AI</span>
        <Link href="/login" className="hover:underline text-ink">
          Mulai Cek CV Gratis →
        </Link>
      </footer>
    </main>
  )
}
