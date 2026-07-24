import { ENGINE_VERSION, type AnalysisResult, type CvStructured, type JobParsed } from "@dilirik/shared"
import { ruleBasedScore } from "../scoring/ruleBased"
import { blendScores, semanticScore } from "../scoring/semantic"
import { analyzeGaps } from "../analysis/gaps"
import { generateSuggestions } from "../analysis/suggestions"

/**
 * Orkestrasi pipeline analisis (PRD §8):
 * rule-based → semantic (fallback-safe) → gap → saran (guardrail 3-titik).
 * rawText dipakai agar `before` pada saran berupa kutipan verbatim teks CV
 * (bisa diganti otomatis di step revisi).
 * Fungsi ini murni terhadap DB — caching & kuota diurus layer API.
 */
export async function analyze(args: {
  cv: CvStructured
  job: JobParsed
  rawText: string
  language: string
}): Promise<AnalysisResult> {
  const { cv, job, rawText, language } = args

  // 1) Rule-based: deterministik, selalu tersedia (sanity check + fallback)
  const rule = ruleBasedScore(cv, job)

  // 2) Semantic: bila gagal validasi → fallback ke rule-based (PRD §12 Reliabilitas)
  let semantic: number | null = null
  try {
    const s = await semanticScore(cv, job)
    semantic = s.score
  } catch {
    semantic = null
  }

  // 3) Gap analysis (gap beneran vs gap penyajian)
  const gaps = await analyzeGaps({
    cv,
    job,
    missingMust: rule.missingMust,
    missingNice: rule.missingNice,
    language,
  })

  // 4) Saran tulis ulang jujur + post-check fakta (before = kutipan verbatim)
  const { accepted, rejected } = await generateSuggestions({ cv, job, rawText, language })

  return {
    matchScore: blendScores(rule.score, semantic),
    ruleScore: rule.score,
    semanticScore: semantic,
    gaps,
    suggestions: accepted,
    rejectedSuggestions: rejected,
    language,
    engineVersion: ENGINE_VERSION,
  }
}
