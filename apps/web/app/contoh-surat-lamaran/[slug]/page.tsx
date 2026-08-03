import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { FiArrowLeft, FiCheckCircle, FiFileText, FiZap, FiCopy } from "react-icons/fi"
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

  const url = absoluteUrl(`/contoh-surat-lamaran/${data.slug}`)

  return {
    title: data.metaTitle,
    description: data.metaDescription,
    keywords: data.keywords,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: data.metaTitle,
      description: data.metaDescription,
      url,
      type: "article",
      siteName,
    },
  }
}

export default async function ContohSuratLamaranPage({ params }: Props) {
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
        name: `Contoh Surat Lamaran ${data.title}`,
        item: absoluteUrl(`/contoh-surat-lamaran/${data.slug}`),
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
          Contoh Surat Lamaran Kerja {data.title}
        </h1>
        <p className="text-muted text-sm sm:text-base leading-relaxed">
          Gunakan draf surat lamaran kerja {data.title} profesional ini sebagai panduan. Sesuaikan dengan kualifikasi dan CV Anda untuk memperbesar peluang dipanggil wawancara.
        </p>
      </header>

      {/* CTA Box */}
      <div className="bg-yellow/20 border-2 border-line rounded-2xl p-5 md:p-6 shadow-paper space-y-4">
        <div className="flex items-center gap-3">
          <div className="bg-yellow border-2 border-line p-2 rounded-xl text-xl shadow-xs">
            ⚡
          </div>
          <div>
            <h2 className="hand text-xl font-bold text-ink">Ingin Surat Lamaran yang 100% Personal & Akurat?</h2>
            <p className="text-xs text-muted">
              Dilirik AI dapat mencocokkan teks CV Anda dengan deskripsi lowongan kerja untuk membuat surat lamaran unik dalam hitungan detik.
            </p>
          </div>
        </div>
        <Link
          href="/login"
          className="label bg-ink text-paper hover:bg-ink/90 border-2 border-ink px-5 py-2.5 rounded-xl font-bold text-xs inline-flex items-center gap-2 shadow-paper"
        >
          <FiZap className="text-yellow" /> Buat Surat Lamaran AI Gratis
        </Link>
      </div>

      {/* Sample Cover Letter Container */}
      <section className="space-y-4">
        <h2 className="hand text-2xl font-bold text-ink flex items-center gap-2">
          <FiFileText className="text-muted" /> Template Contoh Surat Lamaran {data.title}
        </h2>

        <div className="polaroid bg-paper border-2 border-line p-6 md:p-8 rounded-2xl shadow-lift font-serif text-sm md:text-base leading-relaxed space-y-4 whitespace-pre-line">
          <p className="font-bold">{data.coverLetterTemplate.greeting}</p>
          <p>{data.coverLetterTemplate.opening}</p>
          <p>{data.coverLetterTemplate.body}</p>
          <p>{data.coverLetterTemplate.closing}</p>
          <div className="pt-4 border-t border-line text-xs font-sans text-muted">
            Hormat saya,
            <br />
            <span className="font-bold text-ink">[Nama Lengkap Anda]</span>
          </div>
        </div>
      </section>

      {/* ATS Keywords Section */}
      <section className="space-y-4 bg-panel border-2 border-line p-6 rounded-2xl shadow-paper">
        <h2 className="hand text-2xl font-bold text-ink">
          Kata Kunci (Keywords) ATS Penting untuk {data.title}
        </h2>
        <p className="text-xs text-muted">
          Pastikan kata kunci berikut tercantum di CV dan surat lamaran Anda agar lolos dari penyaringan sistem Applicant Tracking System (ATS):
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {data.atsKeywords.map((kw) => (
            <span
              key={kw}
              className="bg-paper border border-line px-3 py-1 rounded-xl text-xs font-bold text-ink shadow-xs"
            >
              ✓ {kw}
            </span>
          ))}
        </div>
      </section>

      {/* CV Tips Section */}
      <section className="space-y-4">
        <h2 className="hand text-2xl font-bold text-ink">
          Tips Menulis CV ATS {data.title}
        </h2>
        <ul className="space-y-2 text-xs md:text-sm">
          {data.cvTips.map((tip, idx) => (
            <li key={idx} className="flex items-start gap-2 bg-paper border border-line p-3 rounded-xl">
              <FiCheckCircle className="text-green h-4 w-4 shrink-0 mt-0.5" />
              <span>{tip}</span>
            </li>
          ))}
        </ul>
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
