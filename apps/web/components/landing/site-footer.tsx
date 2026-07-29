import Link from "next/link"

import { BrandMark } from "@/components/landing/brand-mark"

const footerLinks = [
  { href: "/pricing", label: "Harga" },
  { href: "/legal/privacy", label: "Kebijakan Privasi" },
  { href: "/legal/terms", label: "Ketentuan Layanan" },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-panel/70">
      <div className="shell mx-auto flex max-w-shell flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <BrandMark />
          <p className="text-sm text-muted">
            Pencocokan CV dan lowongan yang tidak mengarang.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:items-end">
          <nav aria-label="Tautan footer" className="flex flex-wrap gap-5">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted transition-colors hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <p className="text-xs text-muted">
            {new Date().getFullYear()} Dilirik
          </p>
        </div>
      </div>
    </footer>
  )
}
