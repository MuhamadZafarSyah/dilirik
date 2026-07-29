import Link from "next/link"

import type { LegalArticle } from "@/lib/legal/types"

/**
 * Daftar isi untuk dokumen panjang. Dua kolom di layar lebar supaya dua belas
 * pasal tetap terbaca sekali pandang tanpa menjadi daftar bergaris panjang.
 */
export function LegalToc({ articles }: { articles: readonly LegalArticle[] }) {
  return (
    <nav aria-label="Daftar isi" className="py-8">
      <p className="text-xs uppercase tracking-wider text-muted">Daftar isi</p>
      <ul className="mt-4 grid gap-x-10 gap-y-2.5 sm:grid-cols-2">
        {articles.map((article) => (
          <li key={article.id}>
            <Link
              href={"#" + article.id}
              className="text-sm text-ink/80 underline decoration-line decoration-1 underline-offset-4 transition-colors hover:text-ink hover:decoration-ink"
            >
              {article.title}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
