"use client"

import { use, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import {
  FiArrowLeft,
  FiDownload,
  FiEdit2,
  FiSave,
  FiX,
  FiCopy,
  FiCheck,
  FiTrash2,
} from "react-icons/fi"
import { api, errorMessage } from "@/lib/api"
import { useI18n } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { Card, Polaroid } from "@/components/ui/card"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useToast } from "@/components/ui/toast"
import type { CoverLetterDto } from "@dilirik/shared"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.04 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 350, damping: 25 },
  },
}

export default function CoverLetterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = use(params)
  const id = resolvedParams.id
  const router = useRouter()
  const { lang } = useI18n()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState("")
  const [copied, setCopied] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Query: Cover Letter Detail
  const detailQuery = useQuery({
    queryKey: ["cover-letter", id],
    queryFn: async () => {
      const res = await api.get<{ coverLetter: CoverLetterDto }>(`/api/cover-letters/${id}`)
      setEditText(res.data.coverLetter.text)
      return res.data.coverLetter
    },
  })

  // Mutation: Save Edit
  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await api.put<{ coverLetter: CoverLetterDto }>(`/api/cover-letters/${id}`, {
        text: editText,
      })
      return res.data.coverLetter
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["cover-letter", id], updated)
      queryClient.invalidateQueries({ queryKey: ["cover-letters"] })
      setEditing(false)
      toast(lang === "id" ? "Perubahan berhasil disimpan!" : "Changes saved successfully!", "success")
    },
    onError: (err) => {
      toast(errorMessage(err), "error")
    },
  })

  // Mutation: Delete
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/api/cover-letters/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cover-letters"] })
      toast(lang === "id" ? "Surat lamaran berhasil dihapus" : "Cover letter deleted successfully", "success")
      router.push("/app/cover-letters")
    },
    onError: (err) => {
      toast(errorMessage(err), "error")
    },
  })

  const coverLetter = detailQuery.data

  async function handleCopy() {
    if (!coverLetter) return
    try {
      await navigator.clipboard.writeText(coverLetter.text)
      setCopied(true)
      toast(lang === "id" ? "Teks disalin ke clipboard!" : "Text copied to clipboard!", "success")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast(lang === "id" ? "Gagal menyalin teks" : "Failed to copy text", "error")
    }
  }

  function downloadFile(url: string) {
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"
    window.open(`${apiBase}${url}`, "_blank")
  }

  if (detailQuery.isLoading) {
    return (
      <div className="py-20 text-center text-muted font-bold animate-pulse">
        {lang === "id" ? "Memuat surat lamaran..." : "Loading cover letter..."}
      </div>
    )
  }

  if (detailQuery.isError || !coverLetter) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center space-y-4">
        <Card pin tape="red" className="p-6 text-center space-y-3">
          <p className="text-red font-bold">
            {detailQuery.error ? errorMessage(detailQuery.error) : "Surat lamaran tidak ditemukan."}
          </p>
          <Link href="/app/cover-letters">
            <Button variant="secondary" icon={<FiArrowLeft />}>
              Kembali ke Daftar
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  const jobTitle = coverLetter.jobPosting?.title || "Posisi Pekerjaan"
  const companyName = coverLetter.jobPosting?.company || "Perusahaan"
  const cvTitle = coverLetter.cv?.title || "CV"

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 max-w-5xl mx-auto p-4 md:p-6"
    >
      {/* Top Bar Navigation & Actions */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link href="/app/cover-letters" className="label text-muted hover:text-ink flex items-center gap-2 text-sm font-bold w-fit">
          <FiArrowLeft className="h-4 w-4" />
          <span>{lang === "id" ? "Kembali ke Daftar Surat Lamaran" : "Back to Cover Letters"}</span>
        </Link>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopy}
            icon={copied ? <FiCheck className="text-green-600" /> : <FiCopy />}
          >
            {copied ? (lang === "id" ? "Tersalin!" : "Copied!") : lang === "id" ? "Salin Teks" : "Copy Text"}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => downloadFile(`/api/cover-letters/${id}/text`)}
            icon={<FiDownload />}
          >
            TXT
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadFile(`/api/cover-letters/${id}/docx`)}
            icon={<FiDownload />}
            className="text-blue-900 bg-blue-50 border-blue-300 hover:bg-blue-100"
          >
            DOCX
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadFile(`/api/cover-letters/${id}/pdf`)}
            icon={<FiDownload />}
            className="text-red-900 bg-red-50 border-red-300 hover:bg-red-100"
          >
            PDF
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmDelete(true)}
            icon={<FiTrash2 className="text-red" />}
            title="Hapus"
          />
        </div>
      </motion.div>

      {/* Main Cover Letter Scrapbook Card */}
      <motion.div variants={itemVariants}>
        <Polaroid tape="yellow" pin rotate={-0.5} className="p-6 md:p-10 space-y-6">
          {/* Card Header Info */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-line pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="uppercase text-[10px] font-bold bg-panel border border-line px-2 py-0.5 rounded-md text-ink">
                  {coverLetter.template} • {coverLetter.language.toUpperCase()}
                </span>
                <span className="text-xs text-muted font-bold">
                  {coverLetter.wordCount} {lang === "id" ? "kata" : "words"}
                </span>
              </div>
              <h1 className="hand text-3xl font-bold text-ink mt-1">{jobTitle}</h1>
              <p className="text-sm font-bold text-muted">{companyName}</p>
            </div>

            <div className="flex items-center gap-3">
              {coverLetter.relevanceScore !== null && (
                <div className="bg-green-100 border-2 border-green-400 text-green-900 rounded-xl px-4 py-2 text-center shadow-xs">
                  <span className="block text-[10px] uppercase font-bold text-green-700">Relevance</span>
                  <span className="text-xl font-bold">{coverLetter.relevanceScore}%</span>
                </div>
              )}

              {!editing ? (
                <Button
                  variant="yellow"
                  size="sm"
                  icon={<FiEdit2 />}
                  onClick={() => setEditing(true)}
                >
                  {lang === "id" ? "Edit Teks" : "Edit Text"}
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<FiSave />}
                    isLoading={updateMutation.isPending}
                    onClick={() => updateMutation.mutate()}
                  >
                    Simpan
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={updateMutation.isPending}
                    onClick={() => {
                      setEditing(false)
                      setEditText(coverLetter.text)
                    }}
                  >
                    <FiX />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Content Body */}
          {editing ? (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-muted uppercase">
                {lang === "id" ? "Edit Isi Surat Lamaran:" : "Edit Cover Letter Content:"}
              </label>
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={16}
                className="w-full bg-panel border-2 border-line p-4 rounded-xl font-mono text-sm leading-relaxed text-ink focus:outline-none focus:border-ink"
              />
            </div>
          ) : (
            <div className="bg-panel/40 border-2 border-line p-6 md:p-8 rounded-xl space-y-4 font-serif text-ink text-base md:text-lg leading-relaxed whitespace-pre-wrap selection:bg-yellow">
              {coverLetter.text}
            </div>
          )}

          {/* Card Footer */}
          <div className="pt-4 border-t-2 border-line flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted font-bold gap-2">
            <span>
              {lang === "id" ? "Berdasarkan CV:" : "Based on CV:"}{" "}
              <span className="text-ink font-semibold">{cvTitle}</span>
            </span>
            <span>
              Dibuat pada {new Date(coverLetter.createdAt).toLocaleString(lang === "id" ? "id-ID" : "en-US")}
            </span>
          </div>
        </Polaroid>
      </motion.div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={lang === "id" ? "Hapus Surat Lamaran?" : "Delete Cover Letter?"}
        description={
          lang === "id"
            ? "Surat lamaran ini akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan."
            : "This cover letter will be permanently deleted. This action cannot be undone."
        }
        confirmLabel={lang === "id" ? "Ya, Hapus" : "Yes, Delete"}
        cancelLabel={lang === "id" ? "Batal" : "Cancel"}
        onConfirm={async () => {
          await deleteMutation.mutateAsync()
        }}
      />
    </motion.div>
  )
}
