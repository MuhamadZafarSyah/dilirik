import type { LegalArticle } from "@/lib/legal/types"

/**
 * Satu pasal. `scroll-mt` dipasang supaya judul tidak tertutup saat pengguna
 * datang dari tautan anchor di daftar isi.
 */
export function LegalSection({ id, title, paragraphs }: LegalArticle) {
  return (
    <section id={id} className="scroll-mt-24 py-8">
      <h2 className="hand text-2xl text-ink sm:text-3xl">{title}</h2>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-ink/80 sm:text-base">
        {paragraphs.map((paragraph) => (
          <p key={paragraph.slice(0, 48)}>{paragraph}</p>
        ))}
      </div>
    </section>
  )
}
