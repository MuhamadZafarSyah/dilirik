import type { Metadata } from "next"

import { LegalSection } from "@/components/legal/legal-section"
import { LegalShell } from "@/components/legal/legal-shell"
import { PRIVACY_LAST_UPDATED } from "@/lib/legal/meta"
import { privacyArticles, privacySummary } from "@/lib/legal/privacy-content"

const title = "Kebijakan Privasi"
const description =
  "Data apa yang Dilirik simpan, untuk apa dipakai, bagaimana CV diproses model AI, retensi, dan keamanannya."

/**
 * Halaman legal tetap `index, follow` (K8): halaman ini memberi sinyal
 * kepercayaan ke Google dan sering dicari langsung oleh calon pengguna.
 */
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/legal/privacy" },
  openGraph: {
    title,
    description,
    url: "/legal/privacy",
  },
}

export default function PrivacyPage() {
  return (
    <LegalShell
      title={title}
      summary={privacySummary}
      lastUpdatedIso={PRIVACY_LAST_UPDATED}
      related={{ href: "/legal/terms", label: "Baca juga: Ketentuan Layanan" }}
    >
      {privacyArticles.map((article) => (
        <LegalSection key={article.id} {...article} />
      ))}
    </LegalShell>
  )
}
