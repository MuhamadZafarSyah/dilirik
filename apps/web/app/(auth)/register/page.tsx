"use client"

import { useState } from "react"
import Link from "next/link"
import { FaGithub, FaGoogle } from "react-icons/fa6"
import { signIn, signUp } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

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
      setError(err.message ?? "Gagal mendaftar, silakan coba lagi.")
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <main className="paper-texture flex min-h-screen items-center justify-center p-4">
        <Card tape="blue" pin rotate={1} className="w-full max-w-md p-8 text-center space-y-4">
          <h2 className="hand text-4xl font-bold text-ink">Cek Email Kamu! 📫</h2>
          <p className="text-muted text-sm leading-relaxed">
            Kami telah mengirimkan link verifikasi ke <strong className="text-ink font-bold">{email}</strong>. Silakan klik link tersebut untuk mengaktifkan akun.
          </p>
          <Link href="/login" className="block pt-2">
            <Button variant="primary" size="lg" className="w-full">
              Ke Halaman Login →
            </Button>
          </Link>
        </Card>
      </main>
    )
  }

  return (
    <main className="paper-texture flex min-h-screen items-center justify-center p-4">
      <Card tape="red" pin rotate={-1} className="w-full max-w-md p-8 space-y-6">
        <div className="text-center">
          <Link href="/" className="inline-block group">
            <span className="hand text-4xl sm:text-5xl font-bold text-ink">Dilirik 👀</span>
          </Link>
          <h1 className="hand text-2xl font-bold text-ink mt-2">Daftar Akun Gratis</h1>
          <p className="scrawl text-muted text-base">Gratis 10 analisis per bulan. Tanpa kartu kredit.</p>
        </div>

        {/* Social Register */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={<FaGoogle />}
            onClick={() => signIn.social({ provider: "google", callbackURL: `${window.location.origin}/app` })}
          >
            Google
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={<FaGithub />}
            onClick={() => signIn.social({ provider: "github", callbackURL: `${window.location.origin}/app` })}
          >
            GitHub
          </Button>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-line w-full" />
          <span className="scrawl text-muted text-xs bg-panel px-3 absolute">atau pakai email</span>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label text-xs font-bold uppercase text-ink block mb-1">Nama Lengkap</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama kamu"
              className="w-full px-3.5 py-2.5 rounded-xl border-2 border-line bg-paper text-ink text-sm font-semibold outline-none focus:border-ink shadow-inner"
            />
          </div>

          <div>
            <label className="label text-xs font-bold uppercase text-ink block mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@kamu.com"
              className="w-full px-3.5 py-2.5 rounded-xl border-2 border-line bg-paper text-ink text-sm font-semibold outline-none focus:border-ink shadow-inner"
            />
          </div>

          <div>
            <label className="label text-xs font-bold uppercase text-ink block mb-1">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 8 karakter"
              className="w-full px-3.5 py-2.5 rounded-xl border-2 border-line bg-paper text-ink text-sm font-semibold outline-none focus:border-ink shadow-inner"
            />
          </div>

          {error && <p className="text-red text-xs font-semibold">{error}</p>}

          <Button type="submit" isLoading={loading} variant="danger" size="lg" className="w-full">
            Daftar Akun Baru
          </Button>
        </form>

        <div className="text-center text-xs text-muted space-y-1 pt-2 border-t border-line">
          <p>
            Sudah punya akun?{" "}
            <Link href="/login" className="text-red font-bold hover:underline">
              Masuk Di Sini
            </Link>
          </p>
        </div>
      </Card>
    </main>
  )
}
