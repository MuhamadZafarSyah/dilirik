import type { Metadata } from "next"

import { LegalSection } from "@/components/legal/legal-section"
import { LegalShell } from "@/components/legal/legal-shell"
import { LegalToc } from "@/components/legal/legal-toc"
import { TERMS_LAST_UPDATED } from "@/lib/legal/meta"
import { termsArticles, termsSummary } from "@/lib/legal/terms-content"

const title = "Ketentuan Layanan"
const description =
  "Aturan pemakaian Dilirik: akun, kuota beta, kepemilikan dokumen yang kamu unggah, batas penggunaan, dan sifat hasil analisis AI."

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/legal/terms" },
  openGraph: {
    title,
    description,
    url: "/legal/terms",
  },
}

export default function TermsPage() {
  return (
    <LegalShell
      title={title}
      summary={termsSummary}
      lastUpdatedIso={TERMS_LAST_UPDATED}
      related={{ href: "/legal/privacy", label: "Baca juga: Kebijakan Privasi" }}
    >
      <LegalToc articles={termsArticles} />
      {termsArticles.map((article) => (
        <LegalSection key={article.id} {...article} />
      ))}
    </LegalShell>
  )
}
