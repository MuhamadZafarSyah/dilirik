import {
  ENGINE_VERSION,
  PROMPT_VERSION,
  type AnalysisResult,
  type CvStructured,
  type JobParsed,
} from "@dilirik/shared"
import { ruleBasedScore } from "../scoring/ruleBased"
import { blendScores, semanticScore } from "../scoring/semantic"
import { generateAnalysisReport, pickSuggestionMode } from "../analysis/report"

/**
 * Orkestrasi pipeline analisis (engine v2):
 * 1. rule-based (deterministik) → 2. semantic (fallback-safe) →
 * 3. pilih mode saran dari coverage must-have (deterministik di kode) →
 * 4. SATU panggilan laporan gabungan (gaps + suggestions + careerNote) +
 *    guardrail kejujuran & kebergunaan.
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
    const s = await semanticScore(cv, job, language)
    semantic = s.score
  } catch {
    semantic = null
  }

  // 3) Mode strategi saran — deterministik dari coverage must-have
  const mode = pickSuggestionMode(rule)

  // 4) Laporan gabungan: diagnosis (gaps) → resep (suggestions) → catatan jujur
  const report = await generateAnalysisReport({
    cv,
    job,
    rawText,
    language,
    mode,
    rule: {
      matchedMust: rule.matchedMust,
      missingMust: rule.missingMust,
      missingNice: rule.missingNice,
    },
  })

  return {
    matchScore: blendScores(rule.score, semantic),
    ruleScore: rule.score,
    semanticScore: semantic,
    mode,
    gaps: report.gaps,
    suggestions: report.suggestions,
    rejectedSuggestions: report.rejected,
    careerNote: report.careerNote,
    language,
    engineVersion: ENGINE_VERSION,
    promptVersion: PROMPT_VERSION,
  }
}
