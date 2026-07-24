import Link from "next/link"

/** Halaman tujuan link verifikasi email (Better Auth me-redirect ke sini setelah verifikasi). */
export default function VerifyEmailPage() {
  return (
    <main className="paper-texture flex min-h-screen items-center justify-center px-4">
      <div className="card bg-panel border-line relative max-w-md rotate-[-1deg] rounded-lg border-2 p-8 text-center shadow-lift">
        <span className="tape" aria-hidden />
        <p className="hand text-3xl">Email terverifikasi ✅</p>
        <p className="text-muted mt-3 text-sm">Akun kamu siap. Yuk mulai analisis pertamamu!</p>
        <Link href="/app" className="label bg-red text-paper mt-6 inline-block rounded-md px-5 py-2 text-sm font-bold">
          Masuk ke dashboard →
        </Link>
      </div>
    </main>
  )
}
