"use client"

import { useEffect, useState } from "react"
import { api, errorMessage } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useI18n, type Lang } from "@/lib/i18n"

type Settings = {
  user: { id: string; name: string; email: string; plan: string; uiLanguage: string | null; createdAt: string }
  connectedAccounts: string[]
  quota: { quota: number | null; used: number; remaining: number | null; resetAt: string }
}

/** Settings (PRD /app/settings): profil, bahasa UI, akun terhubung, kuota. */
export default function SettingsPage() {
  const { lang, setLang, t } = useI18n()
  const [data, setData] = useState<Settings | null>(null)
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api.get<Settings>("/api/settings").then((r) => {
      setData(r.data)
      setName(r.data.user.name)
      if (r.data.user.uiLanguage === "id" || r.data.user.uiLanguage === "en") setLang(r.data.user.uiLanguage)
    }).catch(() => {})
  }, [setLang])

  if (!data) return <p className="scrawl text-2xl">{t("loading")}</p>

  async function save(payload: { name?: string; uiLanguage?: Lang }) {
    setError(null)
    try {
      await api.patch("/api/settings", payload)
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="hand text-4xl">{t("settings")}</h1>

      <Card className="rotate-[-0.5deg] space-y-4">
        <p className="label text-xs font-bold uppercase">Profil</p>
        <input value={name} onChange={(e) => setName(e.target.value)}
          className="border-line bg-paper w-full rounded-md border-2 px-3 py-2 text-sm outline-none focus:border-ink" />
        <p className="text-muted text-sm">{data.user.email} · plan: <span className="label font-bold uppercase">{data.user.plan}</span></p>
        <div className="flex items-center gap-3">
          <Button onClick={() => save({ name })}>Simpan</Button>
          {saved ? <span className="scrawl text-green text-xl">tersimpan ✓</span> : null}
        </div>
      </Card>

      <Card className="rotate-[0.5deg] space-y-3">
        <p className="label text-xs font-bold uppercase">Bahasa UI</p>
        <div className="flex gap-2">
          {(["id", "en"] as const).map((l) => (
            <button key={l} onClick={() => { setLang(l); save({ uiLanguage: l }) }}
              className={`label rounded-sm px-4 py-1.5 text-xs font-bold uppercase ${lang === l ? "bg-ink text-paper" : "bg-panel border-line border-2"}`}>
              {l === "id" ? "🇮🇩 Indonesia" : "🇬🇧 English"}
            </button>
          ))}
        </div>
        <p className="text-muted text-xs">Bahasa hasil analisis selalu mengikuti bahasa CV-mu, bukan bahasa UI.</p>
      </Card>

      <Card className="rotate-[-0.5deg]">
        <p className="label text-xs font-bold uppercase">Akun terhubung</p>
        <div className="mt-2 flex gap-2">
          {["google", "github", "credential"].map((provider) => (
            <span key={provider}
              className={`label rounded-sm px-3 py-1 text-xs font-bold uppercase ${
                data.connectedAccounts.includes(provider) ? "bg-green/20 text-green" : "bg-line/40 text-muted"
              }`}>
              {provider === "credential" ? "email" : provider} {data.connectedAccounts.includes(provider) ? "✓" : "—"}
            </span>
          ))}
        </div>
      </Card>

      <Card className="rotate-[0.5deg]">
        <p className="label text-xs font-bold uppercase">Kuota analisis</p>
        <p className="hand mt-1 text-3xl">
          {data.quota.quota === null ? "♾︎ unlimited" : `${data.quota.remaining} / ${data.quota.quota}`}
        </p>
        <p className="text-muted text-xs">Reset: {new Date(data.quota.resetAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
      </Card>

      {error ? <p className="text-red text-sm">{error}</p> : null}
    </div>
  )
}
