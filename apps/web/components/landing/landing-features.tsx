"use client"

import { FiCheckCircle, FiXCircle } from "react-icons/fi"
import { Card } from "@/components/ui/card"
import { ScoreGauge } from "@/components/ui/gauge"

export function LandingFeatures() {
  return (
    <>
      {/* ===== Bento fitur ===== */}
      <section id="fitur" className="scroll-mt-24 border-t-2 border-line">
        <div className="shell py-20 md:py-24">
          <div className="mb-12 space-y-3 text-center">
            <span className="label rounded-full border border-yellow/60 bg-yellow/40 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-ink">
              Fitur Unggulan
            </span>
            <h2 className="hand text-4xl font-bold sm:text-6xl">Satu aplikasi untuk seluruh siklus lamaran 🛠️</h2>
            <p className="scrawl mx-auto max-w-xl text-xl text-muted">
              bukan sekadar AI penulis ulang teks — setiap fitur didesain agar kamu dipanggil interview.
            </p>
          </div>

          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-4">
            <Card tape="yellow" rotate={-0.6} className="flex flex-col justify-between space-y-4 p-6 sm:p-8 md:col-span-2">
              <div className="space-y-3">
                <span className="label rounded-full bg-ink px-3 py-1 text-xs font-bold uppercase text-paper">
                  Fitur Utama 🛡️
                </span>
                <h3 className="hand text-3xl font-bold text-ink">Guardrail Kejujuran 3-Titik</h3>
                <p className="text-xs leading-relaxed text-muted sm:text-sm">
                  Setiap saran revisi yang dihasilkan AI selalu melewati 3 tahap validasi ketat: (1) Lock data
                  asli CV sebagai source of truth, (2) Deteksi pemisahan gap, dan (3) Cek fakta anti-mengarang.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 border-t border-line pt-2">
                <div className="rounded-lg border border-line bg-paper p-2.5 text-center">
                  <span className="label block text-xs font-bold text-ink">1. Lock Fakta</span>
                  <span className="text-[10px] text-muted">Bebas Halusinasi</span>
                </div>
                <div className="rounded-lg border border-line bg-paper p-2.5 text-center">
                  <span className="label block text-xs font-bold text-ink">2. Pisah Gap</span>
                  <span className="text-[10px] text-muted">Real vs Presentation</span>
                </div>
                <div className="rounded-lg border border-line bg-paper p-2.5 text-center">
                  <span className="label block text-xs font-bold text-ink">3. Cek Ulang</span>
                  <span className="text-[10px] text-muted">Verified 100%</span>
                </div>
              </div>
            </Card>

            <Card tape="blue" pin rotate={0.8} className="flex flex-col justify-between space-y-3 p-6 text-center">
              <div className="space-y-2">
                <span className="label rounded border border-blue/40 bg-blue/20 px-2.5 py-0.5 text-[10px] font-bold uppercase text-blue">
                  Match Engine
                </span>
                <h3 className="hand text-2xl font-bold text-ink">Skor Match Presisi</h3>
              </div>
              <div className="flex justify-center py-2">
                <ScoreGauge score={88} size={120} />
              </div>
              <p className="text-xs text-muted">Algoritma menghitung persentase kualifikasi wajib lowongan.</p>
            </Card>

            <Card tape="red" rotate={-0.8} className="flex flex-col justify-between space-y-3 p-6">
              <div className="space-y-2">
                <span className="label rounded bg-red/20 px-2.5 py-0.5 text-[10px] font-bold uppercase text-red">
                  Docx Engine
                </span>
                <h3 className="hand text-2xl font-bold text-ink">Revisi .DOCX Native</h3>
              </div>
              <p className="text-xs leading-relaxed text-muted">
                Unggah file Word (.docx) kamu, Dilirik merevisi teksnya langsung tanpa merusak desain, layout,
                font, dan tabel asli milikmu.
              </p>
              <span className="label block rounded-lg border border-line bg-paper px-2.5 py-1 text-center text-[11px] font-bold text-ink">
                📄 Layout & Font Utuh 100%
              </span>
            </Card>

            <Card tape="blue" pin rotate={0.5} className="flex flex-col justify-between space-y-3 p-6 md:col-span-2">
              <div className="space-y-2">
                <span className="label rounded border border-blue/40 bg-blue/20 px-2.5 py-0.5 text-[10px] font-bold uppercase text-blue">
                  Live Interview AI 🎤
                </span>
                <h3 className="hand text-2xl font-bold text-ink">Latihan Interview Berbasis CV Kamu</h3>
                <p className="text-xs leading-relaxed text-muted">
                  Simulasi wawancara real-time yang menyusun pertanyaan dari CV + lowongan aslimu, lengkap
                  dengan feedback per jawaban dan skor akhir kesiapan.
                </p>
              </div>
              <div className="space-y-2 border-t border-line pt-3">
                <p className="max-w-[85%] rounded-lg rounded-bl-none border border-line bg-paper p-2 text-[11px] text-ink">
                  🤖 Ceritakan bagaimana kamu menurunkan LCP jadi 1.2 detik?
                </p>
                <p className="ml-auto max-w-[85%] rounded-lg rounded-br-none border border-blue/40 bg-blue/15 p-2 text-right text-[11px] text-ink">
                  🙋 Saya profiling bundle, lalu terapkan SSR + prefetch…
                </p>
              </div>
            </Card>

            <Card rotate={-0.5} className="flex flex-col justify-between space-y-3 p-6 md:col-span-2">
              <div className="space-y-2">
                <span className="label rounded border border-green/40 bg-green/20 px-2.5 py-0.5 text-[10px] font-bold uppercase text-green">
                  Kanban Tracker
                </span>
                <h3 className="hand text-2xl font-bold text-ink">Tracker Pelamaran Drag & Drop</h3>
                <p className="text-xs leading-relaxed text-muted">
                  Seret kartu lamaran antar kolom status — persis memindahkan sticky note di papan kerjamu.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 border-t border-line pt-2">
                <span className="label rounded-md border border-line bg-paper px-2.5 py-1 text-xs font-bold text-ink">📌 Disimpan</span>
                <span className="label rounded-md bg-yellow/30 px-2.5 py-1 text-xs font-bold text-ink">📤 Dilamar</span>
                <span className="label rounded-md bg-blue/20 px-2.5 py-1 text-xs font-bold text-blue">🗣 Interview</span>
                <span className="label rounded-md bg-green/20 px-2.5 py-1 text-xs font-bold text-green">🎉 Offer</span>
              </div>
            </Card>

            <Card tape="red" rotate={0.4} className="flex flex-col justify-between space-y-3 p-6 md:col-span-2">
              <div className="space-y-2">
                <span className="label rounded bg-red/20 px-2.5 py-0.5 text-[10px] font-bold uppercase text-red">
                  Compare Visual
                </span>
                <h3 className="hand text-2xl font-bold text-ink">Bandingkan CV Sebelum vs Sesudah</h3>
                <p className="text-xs leading-relaxed text-muted">
                  Lihat CV lama dan hasil revisi berdampingan dalam bentuk PDF beneran dengan desain asli —
                  bukan sekadar dua kolom teks.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 border-t border-line pt-3">
                <div className="rounded-lg border border-red/30 bg-red/10 p-2 text-center">
                  <span className="label block text-xs font-bold uppercase text-red">Sebelum</span>
                  <span className="text-[10px] text-muted">skor 61 · keyword tipis</span>
                </div>
                <div className="rounded-lg border border-green/40 bg-green/10 p-2 text-center">
                  <span className="label block text-xs font-bold uppercase text-green">Sesudah</span>
                  <span className="text-[10px] text-muted">skor 88 · metrik menonjol</span>
                </div>
              </div>
            </Card>

            <Card tape="yellow" rotate={-0.4} className="flex flex-col justify-between space-y-3 p-6 md:col-span-2">
              <div className="space-y-2">
                <span className="label rounded bg-ink px-2.5 py-0.5 text-[10px] font-bold uppercase text-paper">
                  ATS Friendly
                </span>
                <h3 className="hand text-2xl font-bold text-ink">Ekspor PDF Ramah Parser ATS</h3>
                <p className="text-xs leading-relaxed text-muted">
                  Render ulang PDF instan di browser menggunakan struktur hirarki teks standar universal yang
                  mudah dibaca oleh HR & software screening ATS.
                </p>
              </div>
              <span className="label block rounded-lg bg-yellow/30 px-3 py-1 text-center text-xs font-bold text-ink">
                ⚡ 1-Click Client-Side Export PDF
              </span>
            </Card>
          </div>
        </div>
      </section>

      {/* ===== Cara lama vs Dilirik ===== */}
      <section id="mengapa" className="scroll-mt-24 border-t-2 border-line">
        <div className="shell py-20 md:py-24">
          <div className="mb-12 space-y-3 text-center">
            <h2 className="hand text-4xl font-bold sm:text-5xl">Kenapa 80% CV bagus tetap diabaikan HR? 🤔</h2>
            <p className="scrawl mx-auto max-w-xl text-xl text-muted">
              masalah utamanya bukan kurang pengalaman, tapi cara menyajikan fakta dan kata kunci yang tidak pas.
            </p>
          </div>

          <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
            <Card tape="red" rotate={-1} className="space-y-4 border-red/40 bg-red/5 p-6">
              <div className="flex items-center gap-2 font-bold text-red">
                <FiXCircle className="h-6 w-6 shrink-0" />
                <h3 className="hand text-3xl">Cara Lama (Berisiko & Buta)</h3>
              </div>
              <ul className="space-y-3 text-xs font-medium leading-relaxed text-ink sm:text-sm">
                <li className="flex items-start gap-2">
                  <span className="shrink-0 font-bold text-red">✕</span>
                  <span>Asal sebar CV yang sama ke 50 lowongan tanpa optimasi keyword.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="shrink-0 font-bold text-red">✕</span>
                  <span>Gunakan AI generik yang sering menyuruh mengarang pengalaman palsu.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="shrink-0 font-bold text-red">✕</span>
                  <span>Gagal wawancara teknis karena ketahuan bohong di CV.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="shrink-0 font-bold text-red">✕</span>
                  <span>Tidak tahu kenapa CV selalu tertahan di tahap screening HR.</span>
                </li>
              </ul>
            </Card>

            <Card tape="yellow" pin rotate={1} className="space-y-4 border-green/40 bg-green/5 p-6">
              <div className="flex items-center gap-2 font-bold text-green">
                <FiCheckCircle className="h-6 w-6 shrink-0" />
                <h3 className="hand text-3xl">Solusi Dilirik (Smart & Jujur)</h3>
              </div>
              <ul className="space-y-3 text-xs font-medium leading-relaxed text-ink sm:text-sm">
                <li className="flex items-start gap-2">
                  <span className="shrink-0 font-bold text-green">✓</span>
                  <span>Ekstraksi kata kunci spesifik untuk tiap lowongan incaran.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="shrink-0 font-bold text-green">✓</span>
                  <span>
                    <strong>Guardrail Kejujuran 3-Titik</strong> memastikan 100% fakta asli CV kamu.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="shrink-0 font-bold text-green">✓</span>
                  <span>Percaya diri saat interview karena semua pengalaman terverifikasi asli.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="shrink-0 font-bold text-green">✓</span>
                  <span>Skor Match 0–100 dan saran revisi teks instan 1-click.</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </section>
    </>
  )
}
