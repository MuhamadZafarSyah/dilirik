"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useState } from "react"

import { ScoreGauge } from "@/components/ui/gauge"
import { demoSamples } from "@/lib/landing/demo-samples"
import { cn } from "@/lib/utils"

type DemoView = "skor" | "gap" | "revisi"

const views: readonly { id: DemoView; label: string }[] = [
  { id: "skor", label: "Skor" },
  { id: "gap", label: "Gap" },
  { id: "revisi", label: "Revisi teks" },
]

/**
 * Peraga hasil analisis.
 *
 * Memakai komponen `ScoreGauge` yang sama dengan aplikasi, bukan tangkapan
 * layar palsu, sehingga yang dilihat calon pengguna memang keluaran produk.
 * Animasi hanya dipakai saat pindah tampilan, karena di situ gerak memang
 * menjelaskan perubahan keadaan.
 */
export function ProductDemo() {
  const [activeSample, setActiveSample] = useState(0)
  const [activeView, setActiveView] = useState<DemoView>("skor")

  const sample = demoSamples[activeSample]!

  return (
    <section id="contoh" className="shell mx-auto max-w-shell scroll-mt-20 py-20">
      <div className="max-w-2xl space-y-4">
        <p className="text-xs uppercase tracking-wider text-muted">Contoh hasil</p>
        <h2 className="hand text-4xl leading-tight text-ink sm:text-5xl">
          Begini bentuk jawabannya
        </h2>
        <p className="text-base leading-relaxed text-muted">
          Empat contoh di bawah memakai data contoh, bukan data pengguna.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {demoSamples.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveSample(index)}
            aria-pressed={activeSample === index}
            className={cn(
              "rounded-lg border px-3.5 py-2 text-sm transition-colors",
              activeSample === index
                ? "border-ink bg-ink text-paper"
                : "border-line bg-panel text-ink hover:border-ink",
            )}
          >
            {item.role}
          </button>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-[14px] border border-line bg-panel">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
          <p className="text-sm text-muted">
            {sample.role} di {sample.company}
          </p>
          <div className="flex gap-1">
            {views.map((view) => (
              <button
                key={view.id}
                type="button"
                onClick={() => setActiveView(view.id)}
                aria-pressed={activeView === view.id}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  activeView === view.id
                    ? "bg-ink text-paper"
                    : "text-muted hover:text-ink",
                )}
              >
                {view.label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-[300px] px-5 py-7 sm:px-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={sample.id + activeView}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              {activeView === "skor" && (
                <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-center">
                  <ScoreGauge score={sample.score} size={150} />
                  <div className="space-y-3">
                    <p className="text-sm leading-relaxed text-ink/80">
                      Skor dihitung dari kualifikasi wajib di lowongan yang
                      benar-benar terbukti di CV.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {sample.matchSkills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-md border border-green/40 bg-green/10 px-2.5 py-1 text-xs text-green"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeView === "gap" && (
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2 border-l-2 border-red pl-4">
                    <p className="text-xs uppercase tracking-wider text-red">
                      Gap sebenarnya
                    </p>
                    <p className="text-sm leading-relaxed text-ink/80">
                      {sample.realGap}
                    </p>
                    <p className="text-sm leading-relaxed text-muted">
                      Ini tidak kami tambal dengan karangan. Pelajari dasarnya,
                      atau jelaskan pengalaman terdekat saat wawancara.
                    </p>
                  </div>
                  <div className="space-y-2 border-l-2 border-yellow pl-4">
                    <p className="text-xs uppercase tracking-wider text-muted">
                      Gap penyajian
                    </p>
                    <p className="text-sm leading-relaxed text-ink/80">
                      {sample.presentationGap}
                    </p>
                    <p className="text-sm leading-relaxed text-muted">
                      Pengalamannya sudah kamu punya. Yang kurang hanya cara
                      menuliskannya.
                    </p>
                  </div>
                </div>
              )}

              {activeView === "revisi" && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-wider text-muted">
                      Tulisan aslimu
                    </p>
                    <p className="rounded-lg border border-line bg-paper px-4 py-3 text-sm leading-relaxed text-muted">
                      {sample.beforeText}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-wider text-green">
                      Usulan Dilirik
                    </p>
                    <p className="rounded-lg border border-green/40 bg-green/10 px-4 py-3 text-sm leading-relaxed text-ink">
                      {sample.afterText}
                    </p>
                  </div>
                  <p className="text-sm leading-relaxed text-muted">
                    Setiap kalimat usulan wajib punya bukti di CV. Yang tidak
                    terbukti dibuang, bukan diperhalus.
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
