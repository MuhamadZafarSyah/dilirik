import type { Metadata } from "next"
import type { ReactNode } from "react"

/**
 * Halaman auth (login, register, reset password, verify email) tidak boleh
 * diindeks: tidak ada nilai pencarian, dan `/verify-email` bahkan membawa token
 * di query string. Sudah ditutup di robots.txt, tapi `noindex` di level halaman
 * adalah sinyal yang lebih kuat — robots.txt hanya mencegah crawl, bukan indeks
 * bila URL-nya ditautkan dari tempat lain.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
