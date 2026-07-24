"use client"

import { useState } from "react"
import Link from "next/link"
import { FaGithub, FaGoogle } from "react-icons/fa6"
import { signIn, signUp } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"

export default function RegisterPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error: err } = await signUp.email({ name, email, password })
    setLoading(false)
    if (err) {
      setError(err.message ?? "Gagal mendaftar, coba lagi")
      return
    }
    setDone(true) // → arahkan cek email (verifikasi wajib, PRD §7.1)
  }

  if (done) {
    return (
      <main className="paper-texture flex min-h-screen items-center justify-center px-4">
        <div className="card bg-panel border-line relative max-w-md rotate-[1deg] rounded-lg border-2 p-8 text-center shadow-lift">
          <span className="tape-blue" aria-hidden />
          <p className="hand text-3xl">Cek email kamu! 📫</p>
          <p className="text-muted mt-3 text-sm">
            Kami kirim link verifikasi ke <strong className="text-ink">{email}</strong>. Klik link-nya, lalu login.
          </p>
          <Link href="/login" className="label bg-ink text-paper mt-6 inline-block rounded-md px-5 py-2 text-sm font-bold">Ke halaman login</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="paper-texture flex min-h-screen items-center justify-center px-4">
      <div className="card bg-panel border-line relative w-full max-w-md rotate-[-1deg] rounded-lg border-2 p-8 shadow-lift">
        <span className="tape" aria-hidden />
        <Link href="/" className="hand text-3xl">Dilirik 👀</Link>
        <h1 className="label mt-4 text-lg font-bold">Daftar gratis</h1>
        <p className="text-muted mt-1 text-sm">10 analisis/bulan. Nggak perlu kartu kredit.</p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button type="button" variant="secondary" onClick={() => signIn.social({ provider: "google", callbackURL: `${window.location.origin}/app` })}>
            <FaGoogle aria-hidden /> Google
          </Button>
          <Button type="button" variant="secondary" onClick={() => signIn.social({ provider: "github", callbackURL: `${window.location.origin}/app` })}>
            <FaGithub aria-hidden /> GitHub
          </Button>
        </div>
        <div className="text-muted label my-4 text-center text-xs">— atau pakai email —</div>

        <form onSubmit={submit} className="space-y-4">
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama kamu"
            className="border-line bg-paper w-full rounded-md border-2 px-3 py-2 text-sm outline-none focus:border-ink" />
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@kamu.com"
            className="border-line bg-paper w-full rounded-md border-2 px-3 py-2 text-sm outline-none focus:border-ink" />
          <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password (min. 8 karakter)"
            className="border-line bg-paper w-full rounded-md border-2 px-3 py-2 text-sm outline-none focus:border-ink" />
          {error ? <p className="text-red text-sm">{error}</p> : null}
          <Button type="submit" disabled={loading} className="w-full justify-center">
            {loading ? "Sebentar…" : "Daftar"}
          </Button>
        </form>

        <p className="text-muted mt-4 text-sm">
          Sudah punya akun? <Link href="/login" className="text-red underline">Masuk</Link>
        </p>
      </div>
    </main>
  )
}
