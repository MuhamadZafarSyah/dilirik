"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  FiCheckCircle,
  FiAlertCircle,
  FiLoader,
  FiArrowRight,
  FiMail,
} from "react-icons/fi";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

function VerifyEmailContent() {
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMsg("Token verifikasi tidak ditemukan.");
      return;
    }

    let isMounted = true;

    async function verify() {
      try {
        await api.get(`/api/auth/verify-email?token=${token}`);
        if (isMounted) {
          setStatus("success");
          toast("Email kamu berhasil diverifikasi!", "success");
        }
      } catch (err) {
        if (isMounted) {
          setStatus("error");
          if (axios.isAxiosError(err) && err.response?.data?.message) {
            setErrorMsg(String(err.response.data.message));
          } else {
            setErrorMsg("Token tidak valid atau sudah kedaluwarsa.");
          }
        }
      }
    }

    verify();

    return () => {
      isMounted = false;
    };
  }, [token, toast]);

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      toast("Masukkan email kamu terlebih dahulu.", "error");
      return;
    }
    setResending(true);
    try {
      const { error: resendErr } = await authClient.sendVerificationEmail({
        email,
        callbackURL: `${window.location.origin}/verify-email`,
      });
      if (resendErr) {
        toast(resendErr.message ?? "Gagal mengirim ulang email.", "error");
      } else {
        toast("Email verifikasi telah dikirim ulang!", "success");
        setEmail("");
      }
    } catch (err) {
      toast("Terjadi kesalahan. Silakan coba lagi.", "error");
    } finally {
      setResending(false);
    }
  }

  if (status === "loading") {
    return (
      <Card
        tape="yellow"
        pin
        rotate={-1}
        className="p-8 text-center space-y-6 shadow-lift"
      >
        <div className="space-y-4">
          <div className="py-6 flex justify-center">
            <div className="relative">
              {/* Spinning dashed Y2K circle */}
              <div className="absolute -inset-2 rounded-full border-2 border-dashed border-ink animate-spin [animation-duration:6s]" />
              <div className="relative bg-yellow/30 text-ink rounded-full p-4 border-2 border-ink shadow-paper">
                <FiLoader className="h-10 w-10 animate-spin text-ink stroke-[2.5]" />
              </div>
            </div>
          </div>
          <h1 className="hand text-3xl font-bold text-ink">
            Memverifikasi... 🔍
          </h1>
          <p className="scrawl text-muted text-xl max-w-sm mx-auto leading-relaxed">
            Mohon tunggu sebentar ya, kami sedang memverifikasi alamat email
            kamu.
          </p>
        </div>
        <p className="label text-muted text-xs pt-4 border-t border-line/60">
          Dilirik · AI Matcher CV & Tracker Lamaran
        </p>
      </Card>
    );
  }

  if (status === "success") {
    return (
      <Card
        tape="yellow"
        pin
        rotate={-1}
        className="p-8 text-center space-y-6 shadow-lift"
      >
        <div className="space-y-2">
          <span className="label bg-green/20 border border-green/60 text-ink px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 shadow-xs">
            <FiCheckCircle className="text-green h-3.5 w-3.5" /> Sukses
            Verifikasi
          </span>
          <div className="py-4 flex justify-center">
            <div className="relative">
              <div className="absolute -inset-2 rounded-full border-2 border-dashed border-line animate-spin [animation-duration:12s]" />
              <div className="relative bg-green text-paper rounded-full p-4 border-2 border-ink shadow-paper">
                <FiCheckCircle className="h-10 w-10 stroke-[2.5]" />
              </div>
            </div>
          </div>
          <h1 className="hand text-4xl font-bold text-ink">
            Email Terverifikasi! 🎉
          </h1>
          <p className="scrawl text-muted text-xl max-w-sm mx-auto leading-relaxed pt-2">
            Akun kamu sudah aktif sepenuhnya. Sekarang saatnya mempersiapkan CV
            terbaikmu untuk dianalisis oleh AI!
          </p>
        </div>

        <div className="pt-2">
          <Link href="/app" className="block w-full">
            <Button
              variant="danger"
              size="lg"
              icon={<FiArrowRight />}
              tape="red"
              className="w-full"
            >
              Masuk ke Dashboard App
            </Button>
          </Link>
        </div>

        <p className="label text-muted text-xs pt-4 border-t border-line/60">
          Dilirik · AI Matcher CV & Tracker Lamaran
        </p>
      </Card>
    );
  }

  // Error State
  return (
    <Card
      tape="red"
      pin
      rotate={1}
      className="p-8 text-center space-y-6 shadow-lift"
    >
      <div className="space-y-2">
        <span className="label bg-red/20 border border-red/60 text-ink px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 shadow-xs">
          <FiAlertCircle className="text-red h-3.5 w-3.5" /> Gagal Verifikasi
        </span>
        <div className="py-4 flex justify-center">
          <div className="relative">
            <div className="absolute -inset-2 rounded-full border-2 border-dashed border-red/40 animate-wiggle" />
            <div className="relative bg-red text-paper rounded-full p-4 border-2 border-ink shadow-paper">
              <FiAlertCircle className="h-10 w-10 stroke-[2.5]" />
            </div>
          </div>
        </div>
        <h1 className="hand text-3xl font-bold text-ink">
          Verifikasi Gagal 🙈
        </h1>
        <p className="scrawl text-red font-semibold text-lg max-w-sm mx-auto leading-relaxed pt-1">
          {errorMsg ?? "Token tidak valid atau sudah kedaluwarsa."}
        </p>
      </div>

      <div className="border-t border-dashed border-line/60 pt-4 space-y-4">
        <p className="scrawl text-muted text-sm">
          Ingin mengirim ulang email verifikasi baru? Masukkan email kamu di
          bawah:
        </p>
        <form onSubmit={handleResend} className="space-y-3">
          <div className="relative">
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
          <Button
            type="submit"
            isLoading={resending}
            variant="yellow"
            size="md"
            className="w-full"
          >
            Kirim Ulang Email Verifikasi
          </Button>
        </form>
      </div>

      <div className="text-center pt-2 border-t border-line/60">
        <Link
          href="/login"
          className="scrawl text-muted text-sm underline hover:text-ink"
        >
          Kembali ke Halaman Login
        </Link>
      </div>

      <p className="label text-muted text-xs pt-2">
        Dilirik · AI Matcher CV & Tracker Lamaran
      </p>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <main className="paper-texture min-h-screen flex items-center justify-center p-5 text-ink">
      <Suspense
        fallback={
          <div className="text-center py-20 space-y-4">
            <FiLoader className="h-10 w-10 animate-spin mx-auto text-muted" />
            <p className="scrawl text-2xl text-muted">
              Memuat halaman verifikasi...
            </p>
          </div>
        }
      >
        <VerifyEmailContent />
      </Suspense>
    </main>
  );
}
