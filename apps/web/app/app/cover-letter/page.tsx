"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { useQuery } from "@tanstack/react-query"
import { COVER_LETTER_TONE_LABELS, type CoverLetterTone } from "@dilirik/shared"
import { api, type QuotaInfo } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"

type CoverLetterItem = {
  id: string
  title: string
  language: string
  tone: string
  length: string
  createdAt: string
}

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
}

export default function CoverLetterPage() {
  const { data: letters, isLoading } = useQuery({
    queryKey: ["cover-letters"],
    queryFn: async () =>
      (await api.get<{ coverLetters: CoverLetterItem[] }>("/api/cover-letter")).data
        .coverLetters,
  })

  const { data: quota } = useQuery({
    queryKey: ["cover-letter-quota"],
    queryFn: async () =>
      (await api.get<QuotaInfo>("/api/cover-letter/quota")).data,
  })

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="scrawl text-3xl text-ink">Cover Letter</h1>
          <p className="mt-1 text-sm text-muted">
            Surat lamaran yang disusun dari fakta CV kamu — bukan karangan AI.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {quota && (
            <span className="label rounded-full border border-line bg-panel px-3 py-1 text-xs text-muted">
              {quota.quota === null
                ? "Kuota tak terbatas"
                : `Sisa ${quota.remaining}/${quota.quota} bulan ini`}
            </span>
          )}
          <Link href="/app/cover-letter/new">
            <Button variant="primary" tape="yellow">
              Buat surat baru
            </Button>
          </Link>
        </div>
      </header>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-line/40" />
          ))}
        </div>
      ) : !letters || letters.length === 0 ? (
        <EmptyState
          title="Belum ada surat lamaran"
          ctaLabel="Buat surat pertama"
          ctaHref="/app/cover-letter/new"
          note="Pilih CV + lowongan yang sudah tersimpan, lalu tentukan bahasa dan tone-nya."
        />
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid gap-4 sm:grid-cols-2"
        >
          {letters.map((letter, i) => (
            <motion.div key={letter.id} variants={itemVariants}>
              <Link href={`/app/cover-letter/${letter.id}`}>
                <Card tape={(["yellow", "blue", "red"] as const)[i % 3]} rotate={i % 2 ? 0.6 : -0.6}>
                  <h2 className="hand text-lg text-ink">{letter.title}</h2>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span className="rounded-full border border-line px-2 py-0.5">
                      {COVER_LETTER_TONE_LABELS[letter.tone as CoverLetterTone]?.id ?? letter.tone}
                    </span>
                    <span className="rounded-full border border-line px-2 py-0.5 uppercase">
                      {letter.language}
                    </span>
                    <span className="ml-auto">
                      {new Date(letter.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}
