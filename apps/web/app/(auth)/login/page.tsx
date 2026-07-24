"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { FaGithub, FaGoogle } from "react-icons/fa6"
import { signIn } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get("next") ?? "/app"
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error: err } = await signIn.email({ email, password })
    setLoading(false)
    if (err) {
      setError(err.message ?? "Email atau password salah")
      return
    }
    router.push(next)
  }

  async function oauth(provider: "google" | "github") {
    await signIn.social({ provider, callbackURL: `${window.location.origin}${next}` })
  }

  return (
    <main className="paper-texture flex min-h-screen items-center justify-center px-4">
      <div className="card bg-panel border-line relative w-full max-w-md rotate-[-1deg] rounded-lg border-2 p-8 shadow-lift">
        <span className="tape" aria-hidden />
        <Link href="/" className="hand text-3xl">Dilirik 👀</Link>
        <h1 className="label mt-4 text-lg font-bold">Masuk</h1>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button type="button" variant="secondary" onClick={() => oauth("google")}>
            <FaGoogle aria-hidden /> Google
          </Button>
          <Button type="button" variant="secondary" onClick={() => oauth("github")}>
            <FaGithub aria-hidden /> GitHub
          </Button>
        </div>
        <div className="text-muted label my-4 text-center text-xs">— atau pakai email —</div>

        <form onSubmit={submit} className="space-y-4">
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="email@kamu.com"
            className="border-line bg-paper w-full rounded-md border-2 px-3 py-2 text-sm outline-none focus:border-ink"
          />
          <input
            type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
            className="border-line bg-paper w-full rounded-md border-2 px-3 py-2 text-sm outline-none focus:border-ink"
          />
          {error ? <p className="text-red text-sm">{error}</p> : null}
          <Button type="submit" disabled={loading} className="w-full justify-center">
            {loading ? "Sebentar…" : "Masuk"}
          </Button>
        </form>

        <p className="text-muted mt-4 text-sm">
          <Link href="/reset-password" className="underline">Lupa password?</Link> · Belum punya akun?{" "}
          <Link href="/register" className="text-red underline">Daftar</Link>
        </p>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
