import axios from "axios"

/** Axios instance → API Express. Cookie session Better Auth ikut terkirim. */
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
  withCredentials: true,
})

export type QuotaInfo = {
  quota: number | null
  used: number
  remaining: number | null
  resetAt: string
}

export function isQuotaExceeded(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.data?.error === "QUOTA_EXCEEDED"
}

export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error) && error.response?.data?.message) {
    return String(error.response.data.message)
  }
  return "Terjadi kesalahan. Coba lagi ya."
}
