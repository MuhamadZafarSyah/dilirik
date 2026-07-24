import type { NextFunction, Request, Response } from "express"
import { redis } from "../lib/redis"

/**
 * Rate limiter fixed-window sederhana di Redis (kontrol biaya, PRD §8).
 * Key per user (fallback IP). Contoh: rateLimit("analyze", 10, 60) = 10 req/menit.
 */
export function rateLimit(bucket: string, max: number, windowSeconds: number) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const who = req.userId ?? req.ip ?? "anon"
      const windowId = Math.floor(Date.now() / (windowSeconds * 1000))
      const key = `rl:${bucket}:${who}:${windowId}`
      const count = await redis.incr(key)
      if (count === 1) await redis.expire(key, windowSeconds)
      if (count > max) {
        res.status(429).json({
          error: "RATE_LIMITED",
          message: "Terlalu banyak permintaan, coba lagi sebentar lagi",
        })
        return
      }
      next()
    } catch (error) {
      next(error)
    }
  }
}
