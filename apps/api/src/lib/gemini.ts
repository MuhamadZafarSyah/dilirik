import { GoogleGenAI } from "@google/genai"
import { HttpError } from "../middleware/errorHandler"
import { env } from "./env"

/**
 * Ephemeral token Gemini Live (T-M5-03) — perbaikan utama vs referensi Career-Vibe:
 * GEMINI_API_KEY hanya hidup di env API dan TIDAK pernah dikirim ke browser.
 * Browser connect langsung ke Gemini Live memakai token sekali-pakai ini.
 */
let client: GoogleGenAI | null = null

function getGeminiClient(): GoogleGenAI {
  if (!env.GEMINI_API_KEY) {
    throw new HttpError(
      503,
      "INTERVIEW_UNAVAILABLE",
      "Fitur latihan interview belum aktif — GEMINI_API_KEY belum di-set di server",
    )
  }
  if (!client) client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY })
  return client
}

export async function createEphemeralToken(): Promise<{ token: string; expireAt: string }> {
  const ai = getGeminiClient()
  const expireAt = new Date(Date.now() + 30 * 60 * 1000).toISOString() // token hidup 30 menit
  const authToken = await ai.authTokens.create({
    config: {
      uses: 1, // sekali connect — token hangus setelah dipakai
      expireTime: expireAt,
      newSessionExpireTime: new Date(Date.now() + 2 * 60 * 1000).toISOString(), // koneksi baru harus dimulai ≤2 menit
      httpOptions: { apiVersion: "v1alpha" },
    },
  })
  if (!authToken.name) {
    throw new HttpError(502, "INTERVIEW_TOKEN_FAILED", "Gagal membuat token sesi interview — coba lagi")
  }
  return { token: authToken.name, expireAt }
}
