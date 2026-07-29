import Link from "next/link"

import { BrandMark } from "@/components/landing/brand-mark"
import { Button } from "@/components/ui/button"

const navLinks = [
  { href: "#contoh", label: "Contoh hasil" },
  { href: "#fitur", label: "Fitur" },
  { href: "#harga", label: "Harga" },
  { href: "#faq", label: "FAQ" },
]

/**
 * Header satu baris, tinggi tetap di bawah 72 px. Tautan bagian disembunyikan
 * di ponsel dan tidak diganti menu bertumpuk: di layar kecil pengguna cukup
 * menggulir, dan menu tambahan hanya menambah kode tanpa menambah nilai.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-panel/85 backdrop-blur-md">
      <div className="shell mx-auto flex h-16 max-w-shell items-center justify-between gap-6">
        <BrandMark />

        <nav aria-label="Bagian halaman" className="hidden items-center gap-7 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-muted transition-colors hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="hidden text-sm text-ink transition-colors hover:text-red sm:block"
          >
            Masuk
          </Link>
          <Link href="/register">
            <Button variant="primary" size="sm">
              Coba gratis
            </Button>
          </Link>
        </div>
      </div>
    </header>
  )
}
