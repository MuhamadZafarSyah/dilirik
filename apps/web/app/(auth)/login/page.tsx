"use client"

import { useEffect, Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { FaGithub, FaGoogle } from "react-icons/fa6"
import { signIn, useSession } from "@/lib/auth-client"
import { getCaptchaToken } from "@/lib/captcha"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { FiEye, FiEyeOff, FiKey } from "react-icons/fi"

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get("next") ?? "/app"
  const { data: session } = useSession()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (session) {
      router.replace(next)
    }
  }, [session, next, router])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    // Token CAPTCHA (reCAPTCHA v3 / Turnstile) — diverifikasi API sebelum sign-in
    const captchaToken = await getCaptchaToken("login")
    const { error: err } = await signIn.email(
      { email, password },
      { headers: captchaToken ? { "x-captcha-token": captchaToken } : {} },
    )
    setLoading(false)
    if (err) {
      setError(err.message ?? "Email atau password salah")
      return
    }
    window.location.href = next
  }

  async function oauth(provider: "google" | "github") {
    await signIn.social({ provider, callbackURL: `${window.location.origin}${next}` })
  }

  return (
    <main className="paper-texture flex min-h-screen items-center justify-center p-4">
      <Card tape="yellow" pin rotate={-1} className="w-full max-w-md p-8 space-y-6">
        <div className="text-center">
          <Link href="/" className="inline-block group">
            <span className="hand text-4xl sm:text-5xl font-bold text-ink">Dilirik 👀</span>
          </Link>
          <h1 className="hand text-2xl font-bold text-ink mt-2">Selamat Datang Kembali</h1>
          <p className="scrawl text-muted text-base">Masuk ke akun kamu untuk lanjut analisis CV</p>
        </div>

        {/* Social logins */}
        <div className="grid grid-cols-2 gap-3">
          <Button type="button" variant="outline" size="sm" icon={<FaGoogle />} onClick={() => oauth("google")}>
            Google
          </Button>
          <Button type="button" variant="outline" size="sm" icon={<FaGithub />} onClick={() => oauth("github")}>
            GitHub
          </Button>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-line w-full" />
          <span className="scrawl text-muted text-xs bg-panel px-3 absolute">atau pakai email</span>
        </div>

        <form onSubmit={submit} className="space-y-4">
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
            <div className="relative flex items-center">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-muted">
                <FiKey className="h-4 w-4" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 8 karakter"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border-2 border-line bg-paper text-ink text-sm font-semibold outline-none focus:border-ink shadow-inner"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-ink cursor-pointer"
              >
                {showPassword ? (
                  <FiEyeOff className="h-4 w-4" />
                ) : (
                  <FiEye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {error && <p className="text-red text-xs font-semibold">{error}</p>}

          <Button type="submit" isLoading={loading} variant="primary" size="lg" className="w-full">
            Masuk ke App
          </Button>
        </form>

        <div className="text-center text-xs text-muted space-y-1 pt-2 border-t border-line">
          <p>
            <Link href="/reset-password" className="underline hover:text-ink">
              Lupa password?
            </Link>{" "}
            · Belum punya akun?{" "}
            <Link href="/register" className="text-red font-bold hover:underline">
              Daftar Gratis
            </Link>
          </p>
        </div>
      </Card>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="scrawl text-2xl text-center py-20">Memuat Login...</p>}>
      <LoginForm />
    </Suspense>
  )
}
