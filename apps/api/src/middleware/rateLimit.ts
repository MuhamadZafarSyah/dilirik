import type { NextFunction, Request, Response } from "express"
import { redis } from "../lib/redis"
import { logger } from "../lib/logger"
import { getClientIp } from "./security"

/**
 * Rate limiter fixed-window di Redis (kontrol biaya + anti brute-force/DoS).
 * - Key per user login (fallback IP asli via CF-Connecting-IP).
 * - Mengirim header standar RateLimit-* + Retry-After saat 429.
 * - Fail-open: jika Redis down, request tetap diproses (availability first)
 *   tapi kejadiannya di-log sebagai warning.
 *
 * Contoh: rateLimit("analyze", 10, 60) = maksimal 10 request/menit.
 */
export function rateLimit(bucket: string, max: number, windowSeconds: number) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const who = req.userId ?? getClientIp(req)
      const windowId = Math.floor(Date.now() / (windowSeconds * 1000))
      const key = `rl:${bucket}:${who}:${windowId}`
      const count = await redis.incr(key)
      if (count === 1) await redis.expire(key, windowSeconds)

      const remaining = Math.max(0, max - count)
      const resetSeconds = windowSeconds - Math.floor((Date.now() / 1000) % windowSeconds)
      res.setHeader("RateLimit-Limit", String(max))
      res.setHeader("RateLimit-Remaining", String(remaining))
      res.setHeader("RateLimit-Reset", String(resetSeconds))

      if (count > max) {
        res.setHeader("Retry-After", String(resetSeconds))
        logger.warn({ bucket, who, count }, "rate limited")
        res.status(429).json({
          error: "RATE_LIMITED",
          message: "Terlalu banyak permintaan, coba lagi sebentar lagi",
        })
        return
      }
      next()
    } catch (error) {
      // Fail-open: Redis bermasalah bukan alasan menolak semua traffic.
      logger.warn({ err: error, bucket }, "rate limiter unavailable — failing open")
      next()
    }
  }
}
