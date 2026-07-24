"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"

/** Reset password: minta link (tanpa token) atau set password baru (dengan token). */
function ResetPasswordForm() {
  const params = useSearchParams()
  const token = params.get("token")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function requestLink(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await authClient.requestPasswordReset({ email, redirectTo: `${window.location.origin}/reset-password` })
    setLoading(false)
    setMessage("Kalau email itu terdaftar, link reset sudah kami kirim. Cek inbox ya!")
  }

  async function setNewPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    setLoading(true)
    const { error } = await authClient.resetPassword({ newPassword: password, token })
    setLoading(false)
    setMessage(error ? "Link tidak valid / kedaluwarsa. Minta link baru ya." : "Password berhasil diganti! Silakan login.")
  }

  return (
    <main className="paper-texture flex min-h-screen items-center justify-center px-4">
      <div className="card bg-panel border-line relative w-full max-w-md rotate-[1deg] rounded-lg border-2 p-8 shadow-lift">
        <span className="tape-red" aria-hidden />
        <h1 className="hand text-3xl">Reset password</h1>
        {message ? (
          <>
            <p className="text-ink mt-4 text-sm">{message}</p>
            <Link href="/login" className="label bg-ink text-paper mt-6 inline-block rounded-md px-5 py-2 text-sm font-bold">Ke login</Link>
          </>
        ) : token ? (
          <form onSubmit={setNewPassword} className="mt-6 space-y-4">
            <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Password baru (min. 8 karakter)"
              className="border-line bg-paper w-full rounded-md border-2 px-3 py-2 text-sm outline-none focus:border-ink" />
            <Button type="submit" disabled={loading} className="w-full justify-center">Simpan password baru</Button>
          </form>
        ) : (
          <form onSubmit={requestLink} className="mt-6 space-y-4">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@kamu.com"
              className="border-line bg-paper w-full rounded-md border-2 px-3 py-2 text-sm outline-none focus:border-ink" />
            <Button type="submit" disabled={loading} className="w-full justify-center">Kirim link reset</Button>
          </form>
        )}
      </div>
    </main>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  )
}
