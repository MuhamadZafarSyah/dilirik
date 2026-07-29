"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  FiEye,
  FiEyeOff,
  FiCheck,
  FiInfo,
  FiKey,
  FiMail,
} from "react-icons/fi";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, Sticky } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

/** Reset password: minta link (tanpa token) atau set password baru (dengan token). */
function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Strong password criteria
  const isMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const isPasswordStrong =
    isMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;
  const isMatch = password === confirmPassword;

  async function requestLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await authClient.requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setMessage(
        "Kalau email itu terdaftar, link reset sudah kami kirim. Cek inbox ya!",
      );
      toast("Link reset password berhasil dikirim!", "success");
    } catch (err) {
      toast("Gagal meminta link reset password. Silakan coba lagi.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function setNewPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    if (!isPasswordStrong) {
      toast("Password kamu belum memenuhi kriteria password kuat.", "error");
      return;
    }

    if (!isMatch) {
      toast("Konfirmasi password tidak cocok.", "error");
      return;
    }

    setLoading(true);
    try {
      const { error } = await authClient.resetPassword({
        newPassword: password,
        token,
      });
      if (error) {
        setMessage("Link tidak valid / kedaluwarsa. Minta link baru ya.");
        toast(error.message ?? "Gagal mereset password.", "error");
      } else {
        setMessage("Password berhasil diganti! Silakan login kembali.");
        toast("Password berhasil diganti!", "success");
      }
    } catch (err) {
      toast("Terjadi kesalahan. Silakan coba lagi.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="paper-texture flex min-h-screen items-center justify-center p-4">
      <Card
        tape={token ? "blue" : "red"}
        pin
        rotate={token ? -1 : 1}
        className="w-full max-w-md p-8 space-y-6"
      >
        <div className="text-center">
          <Link href="/" className="inline-block group">
            <span className="hand text-4xl font-bold text-ink">Dilirik 👀</span>
          </Link>
          <h1 className="hand text-2xl font-bold text-ink mt-2">
            Reset Password
          </h1>
          <p className="scrawl text-muted text-base">
            {token
              ? "Masukkan password barumu di bawah"
              : "Kami akan mengirimkan link untuk menyetel ulang password"}
          </p>
        </div>

        {message ? (
          <div className="space-y-4 text-center">
            <p className="scrawl text-lg text-ink font-semibold bg-yellow/20 p-4 border border-dashed border-yellow rounded-xl">
              {message}
            </p>
            <Link href="/login" className="block">
              <Button variant="primary" size="lg" className="w-full">
                Ke Halaman Login →
              </Button>
            </Link>
          </div>
        ) : token ? (
          <form onSubmit={setNewPassword} className="space-y-4">
            {/* New Password input */}
            <div>
              <label className="label text-xs font-bold uppercase text-ink block mb-1">
                Password Baru
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
                  placeholder="Password Baru"
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

            {/* Confirm Password input */}
            <div>
              <label className="label text-xs font-bold uppercase text-ink block mb-1">
                Konfirmasi Password Baru
              </label>
              <div className="relative flex items-center">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-muted">
                  <FiKey className="h-4 w-4" />
                </span>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi Password Baru"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border-2 border-line bg-paper text-ink text-sm font-semibold outline-none focus:border-ink shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-ink cursor-pointer"
                >
                  {showConfirmPassword ? (
                    <FiEyeOff className="h-4 w-4" />
                  ) : (
                    <FiEye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {confirmPassword && !isMatch && (
                <p className="text-red text-xs mt-1 font-semibold">
                  Konfirmasi password tidak cocok.
                </p>
              )}
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

            <Button
              type="submit"
              disabled={loading || !isPasswordStrong || !isMatch}
              variant="primary"
              size="lg"
              className="w-full"
            >
              Simpan Password Baru
            </Button>
          </form>
        ) : (
          <form onSubmit={requestLink} className="space-y-4">
            <div>
              <label className="label text-xs font-bold uppercase text-ink block mb-1">
                Email Akun
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
            <Button
              type="submit"
              isLoading={loading}
              variant="primary"
              size="lg"
              className="w-full"
            >
              Kirim Link Reset
            </Button>
          </form>
        )}

        <div className="text-center text-xs text-muted space-y-1 pt-2 border-t border-line">
          <Link
            href="/login"
            className="scrawl text-sm underline hover:text-ink block"
          >
            Kembali ke Halaman Login
          </Link>
        </div>
      </Card>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="paper-texture flex min-h-screen items-center justify-center p-5 text-ink">
          <p className="scrawl text-2xl text-muted">Memuat halaman reset...</p>
        </main>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
