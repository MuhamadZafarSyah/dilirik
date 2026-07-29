"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaGithub, FaGoogle } from "react-icons/fa6";
import {
  FiEye,
  FiEyeOff,
  FiCheck,
  FiInfo,
  FiKey,
  FiMail,
  FiUser,
} from "react-icons/fi";
import { signIn, signUp, useSession } from "@/lib/auth-client";
import { getCaptchaToken } from "@/lib/captcha";
import { Button } from "@/components/ui/button";
import { Card, Sticky } from "@/components/ui/card";

export default function RegisterPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  // Strong password criteria
  const isMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const isPasswordStrong =
    isMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;

  useEffect(() => {
    if (session) {
      router.replace("/app");
    }
  }, [session, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isPasswordStrong) {
      setError("Password belum memenuhi kriteria password kuat.");
      return;
    }
    setLoading(true);
    setError(null);
    // Token CAPTCHA (reCAPTCHA v3 / Turnstile) — diverifikasi API sebelum sign-up (anti bot)
    const captchaToken = await getCaptchaToken("register");
    const { error: err } = await signUp.email(
      { name, email, password },
      { headers: captchaToken ? { "x-captcha-token": captchaToken } : {} },
    );
    setLoading(false);
    if (err) {
      setError(err.message ?? "Gagal mendaftar, silakan coba lagi.");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <main className="paper-texture flex min-h-screen items-center justify-center p-4">
        <Card
          tape="blue"
          pin
          rotate={1}
          className="w-full max-w-md p-8 text-center space-y-4"
        >
          <h2 className="hand text-4xl font-bold text-ink">
            Cek Email Kamu! 📫
          </h2>
          <p className="text-muted text-sm leading-relaxed">
            Kami telah mengirimkan link verifikasi ke{" "}
            <strong className="text-ink font-bold">{email}</strong>. Silakan
            klik link tersebut untuk mengaktifkan akun.
          </p>
          <Link href="/login" className="block pt-2">
            <Button variant="primary" size="lg" className="w-full">
              Ke Halaman Login →
            </Button>
          </Link>
        </Card>
      </main>
    );
  }

  return (
    <main className="paper-texture flex min-h-screen items-center justify-center p-4">
      <Card
        tape="red"
        pin
        rotate={-1}
        className="w-full max-w-md p-8 space-y-6"
      >
        <div className="text-center">
          <Link href="/" className="inline-block group">
            <span className="hand text-4xl sm:text-5xl font-bold text-ink">
              Dilirik 👀
            </span>
          </Link>
          <h1 className="hand text-2xl font-bold text-ink mt-2">
            Daftar Akun Gratis
          </h1>
          <p className="scrawl text-muted text-base">
            Gratis 10 analisis per bulan. Tanpa kartu kredit.
          </p>
        </div>

        {/* Social Register */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={<FaGoogle />}
            onClick={() =>
              signIn.social({
                provider: "google",
                callbackURL: `${window.location.origin}/app`,
              })
            }
          >
            Google
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={<FaGithub />}
            onClick={() =>
              signIn.social({
                provider: "github",
                callbackURL: `${window.location.origin}/app`,
              })
            }
          >
            GitHub
          </Button>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-line w-full" />
          <span className="scrawl text-muted text-xs bg-panel px-3 absolute">
            atau pakai email
          </span>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label text-xs font-bold uppercase text-ink block mb-1">
              Nama Lengkap
            </label>
            <div className="relative flex items-center">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-muted">
                <FiUser className="h-4 w-4" />
              </span>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama kamu"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border-2 border-line bg-paper text-ink text-sm font-semibold outline-none focus:border-ink shadow-inner"
              />
            </div>
          </div>

          <div>
            <label className="label text-xs font-bold uppercase text-ink block mb-1">
              Email
            </label>
            <div className="relative flex items-center">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-muted">
                <FiMail className="h-4 w-4" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@kamu.com"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border-2 border-line bg-paper text-ink text-sm font-semibold outline-none focus:border-ink shadow-inner"
              />
            </div>
          </div>

          <div>
            <label className="label text-xs font-bold uppercase text-ink block mb-1">
              Password
            </label>
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

          {/* Password strength checklist - Minimalist */}
          <div className="text-[11px] space-y-1.5 pt-3 px-1 border-t border-dashed border-line/60">
            <p className="font-bold text-ink/70 uppercase tracking-wider">
              Kriteria Password Kuat:
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-ink/60 font-bold">
              <div
                className={`flex items-center gap-1.5 ${isMinLength ? "text-green" : ""}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${isMinLength ? "bg-green" : "bg-line"}`}
                />
                <span>Min. 8 karakter</span>
              </div>
              <div
                className={`flex items-center gap-1.5 ${hasUppercase ? "text-green" : ""}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${hasUppercase ? "bg-green" : "bg-line"}`}
                />
                <span>Huruf besar (A-Z)</span>
              </div>
              <div
                className={`flex items-center gap-1.5 ${hasLowercase ? "text-green" : ""}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${hasLowercase ? "bg-green" : "bg-line"}`}
                />
                <span>Huruf kecil (a-z)</span>
              </div>
              <div
                className={`flex items-center gap-1.5 ${hasNumber ? "text-green" : ""}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${hasNumber ? "bg-green" : "bg-line"}`}
                />
                <span>Angka (0-9)</span>
              </div>
              <div
                className={`flex items-center gap-1.5 ${hasSpecial ? "text-green" : ""}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${hasSpecial ? "bg-green" : "bg-line"}`}
                />
                <span>Karakter spesial</span>
              </div>
            </div>
          </div>

          {error && <p className="text-red text-xs font-semibold">{error}</p>}

          <Button
            type="submit"
            isLoading={loading}
            disabled={loading || !isPasswordStrong}
            variant="danger"
            size="lg"
            className="w-full"
          >
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
  );
}
