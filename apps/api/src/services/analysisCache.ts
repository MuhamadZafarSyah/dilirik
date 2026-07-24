import { createHash } from "node:crypto"
import type { AnalysisResult } from "@dilirik/shared"
import { redis } from "../lib/redis"

const TTL_SECONDS = 60 * 60 * 24 * 30 // 30 hari

/** Key cache = hash(cvText + jobText + engineVersion) — PRD §8 kontrol biaya. */
export function analysisCacheKey(cvRawText: string, jobRawText: string, engineVersion: string): string {
  return (
    "analysis:" +
    createHash("sha256").update(cvRawText).update("\u0000").update(jobRawText).update("\u0000").update(engineVersion).digest("hex")
  )
}

export async function getCachedAnalysis(key: string): Promise<AnalysisResult | null> {
  const raw = await redis.get<string>(key)
  if (!raw) return null
  try {
    return typeof raw === "string" ? (JSON.parse(raw) as AnalysisResult) : (raw as unknown as AnalysisResult)
  } catch {
    return null
  }
}

export async function setCachedAnalysis(key: string, result: AnalysisResult): Promise<void> {
  await redis.set(key, JSON.stringify(result), { ex: TTL_SECONDS })
}
