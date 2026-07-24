import { Redis } from "@upstash/redis"
import { env } from "./env"

/**
 * Redis (Upstash REST). Di dev tanpa kredensial → fallback in-memory
 * supaya DX mulus; di production WAJIB set env.
 */
type RedisLike = {
  get: <T = string>(key: string) => Promise<T | null>
  set: (key: string, value: string, opts?: { ex?: number }) => Promise<unknown>
  incr: (key: string) => Promise<number>
  expire: (key: string, seconds: number) => Promise<unknown>
}

class MemoryRedis implements RedisLike {
  private store = new Map<string, { value: string; expiresAt: number | null }>()
  private live(key: string) {
    const e = this.store.get(key)
    if (!e) return null
    if (e.expiresAt !== null && Date.now() > e.expiresAt) {
      this.store.delete(key)
      return null
    }
    return e
  }
  async get<T = string>(key: string) {
    return (this.live(key)?.value ?? null) as T | null
  }
  async set(key: string, value: string, opts?: { ex?: number }) {
    this.store.set(key, {
      value,
      expiresAt: opts?.ex ? Date.now() + opts.ex * 1000 : null,
    })
    return "OK"
  }
  async incr(key: string) {
    const current = Number(this.live(key)?.value ?? "0") + 1
    const existing = this.live(key)
    this.store.set(key, { value: String(current), expiresAt: existing?.expiresAt ?? null })
    return current
  }
  async expire(key: string, seconds: number) {
    const e = this.live(key)
    if (e) e.expiresAt = Date.now() + seconds * 1000
    return 1
  }
}

export const redis: RedisLike =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? (new Redis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
      }) as unknown as RedisLike)
    : new MemoryRedis()
