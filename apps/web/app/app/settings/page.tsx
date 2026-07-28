"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { FiUser, FiGlobe, FiShield, FiZap, FiCheck } from "react-icons/fi"
import { api, errorMessage } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useI18n, type Lang } from "@/lib/i18n"
import { useToast } from "@/components/ui/toast"

type Settings = {
  user: { id: string; name: string; email: string; plan: string; uiLanguage: string | null; createdAt: string }
  connectedAccounts: string[]
  quota: { quota: number | null; used: number; remaining: number | null; resetAt: string }
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.04 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 350, damping: 25 },
  },
}

export default function SettingsPage() {
  const { lang, setLang, t } = useI18n()
  const { toast } = useToast()
  const [data, setData] = useState<Settings | null>(null)
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api
      .get<Settings>("/api/settings")
      .then((r) => {
        setData(r.data)
        setName(r.data.user.name)
        // if (r.data.user.uiLanguage === "id" || r.data.user.uiLanguage === "en") {
        //   setLang(r.data.user.uiLanguage)
        // }
      })
      .catch(() => { })
  }, [setLang])

  if (!data) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="bg-line/30 h-10 w-48 animate-pulse rounded-lg" />
        <div className="bg-line/20 h-96 animate-pulse rounded-xl border border-line" />
      </div>
    )
  }

  async function save(payload: { name?: string; uiLanguage?: Lang }) {
    setError(null)
    setSaving(true)
    try {
      await api.patch("/api/settings", payload)
      toast("Pengaturan berhasil disimpan!", "success")
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="mx-auto max-w-2xl space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="hand text-4xl sm:text-5xl font-bold flex items-center gap-2">
          Pengaturan Akun ⚙️
        </h1>
        <p className="scrawl text-muted text-xl mt-1">
          Kelola profil pengguna, preferensi bahasa, dan kuota analisis.
        </p>
      </motion.div>

      {/* Profile Card */}
      <motion.div variants={itemVariants}>
        <Card tape="yellow" pin className="space-y-4">
          <h3 className="label text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
            <FiUser className="h-4 w-4 text-ink" /> Profil Pengguna
          </h3>
          <div>
            <label className="label text-xs font-bold uppercase text-ink block mb-1">Nama Lengkap</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border-2 border-line bg-paper text-ink text-sm font-semibold outline-none focus:border-ink shadow-inner"
            />
          </div>
          <p className="text-muted text-xs">
            Email: <span className="font-bold text-ink">{data.user.email}</span> · Plan:{" "}
            <span className="label bg-ink text-paper px-2 py-0.5 rounded text-[11px] font-bold uppercase">
              {data.user.plan}
            </span>
          </p>
          <Button onClick={() => save({ name })} isLoading={saving} variant="primary">
            Simpan Profil
          </Button>
        </Card>
      </motion.div>

      {/* Language Preferences */}
      <motion.div variants={itemVariants}>
        <Card rotate={0.5} tape="blue">
          <h3 className="label text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5 mb-3">
            <FiGlobe className="h-4 w-4 text-blue" /> Preferensi Bahasa Antarmuka (UI)
          </h3>
          <div className="flex gap-2">
            {(["id", "en"] as const).map((l) => {
              const active = lang === l
              return (
                <button
                  key={l}
                  onClick={() => {
                    setLang(l)
                    save({ uiLanguage: l })
                  }}
                  className={`label rounded-xl px-4 py-2 text-xs font-bold uppercase transition-all select-none ${active
                      ? "bg-ink text-paper shadow-paper -rotate-1"
                      : "bg-paper border-2 border-line text-ink hover:border-ink"
                    }`}
                >
                  {l === "id" ? "🇮🇩 Bahasa Indonesia" : "🇬🇧 English"}
                </button>
              )
            })}
          </div>
          <p className="text-muted text-xs mt-2">
            Catatan: Bahasa hasil analisis AI selalu menyesuaikan bahasa asli CV kamu secara otomatis.
          </p>
        </Card>
      </motion.div>

      {/* Connected Accounts */}
      <motion.div variants={itemVariants}>
        <Card rotate={-0.5}>
          <h3 className="label text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5 mb-3">
            <FiShield className="h-4 w-4 text-green" /> Akun Terhubung
          </h3>
          <div className="flex flex-wrap gap-2">
            {["google", "github", "credential"].map((provider) => {
              const isConnected = data.connectedAccounts.includes(provider)
              return (
                <span
                  key={provider}
                  className={`label inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase border shadow-xs ${isConnected
                      ? "bg-green/15 border-green/40 text-green"
                      : "bg-line/20 border-line text-muted"
                    }`}
                >
                  {provider === "credential" ? "Email Password" : provider}
                  {isConnected ? <FiCheck className="h-3.5 w-3.5" /> : "—"}
                </span>
              )
            })}
          </div>
        </Card>
      </motion.div>

      {/* Analysis Quota */}
      <motion.div variants={itemVariants}>
        <Card rotate={0.5} tape="red">
          <h3 className="label text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
            <FiZap className="h-4 w-4 text-red" /> Kuota Analisis Bulanan
          </h3>
          <p className="hand mt-1 text-4xl font-bold text-ink">
            {data.quota.quota === null ? "♾︎ Unlimited Pro" : `${data.quota.remaining} / ${data.quota.quota}`}
          </p>
          <p className="text-muted text-xs mt-1">
            Tanggal Reset Kuota:{" "}
            {new Date(data.quota.resetAt).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </Card>
      </motion.div>

      {error && <p className="text-red text-xs font-semibold">{error}</p>}
    </motion.div>
  )
}
