import {
  ENGINE_VERSION,
  PROMPT_VERSION,
  type AnalysisResult,
  type CvStructured,
  type JobParsed,
  type KeywordGap,
  type ReportLanguage,
} from "@dilirik/shared"
import { ruleBasedScore } from "../scoring/ruleBased"
import { blendScores, semanticScore } from "../scoring/semantic"
import { generateAnalysisReport, pickSuggestionMode } from "../analysis/report"

/**
 * Batas kata kunci yang ditawarkan sekaligus.
 *
 * Lebih dari ini artinya bukan soal kata kunci lagi — kecocokannya yang memang
 * tipis, dan itu urusan gaps/careerNote. Membiarkannya panjang juga mengubah
 * fitur ini jadi mesin keyword stuffing, persis yang dilarang engine.
 */
const MAX_KEYWORD_GAPS = 5

/**
 * Rakit daftar "kata kunci hilang" secara deterministik dari hasil rule-based.
 *
 * Sengaja TIDAK melibatkan LLM: datanya sudah pasti, dan menyerahkannya ke model
 * hanya menambah biaya, latensi, dan peluang halusinasi untuk informasi yang
 * bisa dihitung.
 *
 * `evidence` wajib ada — tanpa dasar yang bisa disebut ("lewat React &
 * SvelteKit"), kalimatnya berubah dari membela jadi menuduh.
 */
function buildKeywordGaps(
  impliedMust: Array<{
    skill: string
    confidence: "certain" | "likely"
    evidence: string[]
    severity: "must" | "nice"
  }>,
  impliedNice: Array<{
    skill: string
    confidence: "certain" | "likely"
    evidence: string[]
    severity: "must" | "nice"
  }>,
): KeywordGap[] {
  return [...impliedMust, ...impliedNice]
    .filter((item) => item.evidence.length > 0)
    .sort((a, b) => {
      const byConfidence =
        (a.confidence === "certain" ? 0 : 1) - (b.confidence === "certain" ? 0 : 1)
      if (byConfidence !== 0) return byConfidence
      return (a.severity === "must" ? 0 : 1) - (b.severity === "must" ? 0 : 1)
    })
    .slice(0, MAX_KEYWORD_GAPS)
    .map((item) => ({
      skill: item.skill,
      confidence: item.confidence,
      evidence: item.evidence,
      severity: item.severity,
    }))
}

/**
 * Orkestrasi pipeline analisis (engine v2):
 * 1. rule-based (deterministik) → 2. semantic (fallback-safe) →
 * 3. pilih mode saran dari coverage must-have (deterministik di kode) →
 * 4. SATU panggilan laporan gabungan (gaps + suggestions + careerNote) +
 *    guardrail kejujuran & kebergunaan.
 * rawText dipakai agar `before` pada saran berupa kutipan verbatim teks CV
 * (bisa diganti otomatis di step revisi).
 * Fungsi ini murni terhadap DB — caching & kuota diurus layer API.
 *
 * Engine v3.3.0: `language` dan `reportLanguage` dipisah. Yang pertama adalah
 * FAKTA tentang dokumen (menentukan bahasa setiap kutipan verbatim), yang kedua
 * adalah PILIHAN pengguna (menentukan bahasa penjelasan yang dia baca).
 * Mencampurnya membuat pelamar Indonesia yang menulis CV berbahasa Inggris
 * untuk ATS ikut menerima laporan berbahasa Inggris.
 */
export async function analyze(args: {
  cv: CvStructured
  job: JobParsed
  rawText: string
  language: string
  /** Default ke bahasa CV supaya pemanggil lama tidak berubah perilakunya. */
  reportLanguage?: ReportLanguage
}): Promise<AnalysisResult> {
  const { cv, job, rawText, language } = args
  const reportLanguage: ReportLanguage | undefined =
    args.reportLanguage ?? (language === "en" ? "en" : "id")

  // 1) Rule-based: deterministik, selalu tersedia (sanity check + fallback)
  const rule = ruleBasedScore(cv, job)

  // 2) Semantic: bila gagal validasi → fallback ke rule-based (PRD §12 Reliabilitas)
  //    Sengaja tetap memakai bahasa CV: keluarannya cuma angka, tidak pernah
  //    dibaca pengguna, jadi bahasa laporan tidak relevan di sini.
  let semantic: number | null = null
  try {
    const s = await semanticScore(cv, job, language)
    semantic = s.score
  } catch {
    semantic = null
  }

  // 3) Mode strategi saran — deterministik dari coverage must-have,
  //    termasuk skill yang tercakup lewat implikasi.
  const mode = pickSuggestionMode(rule)

  // 4) Laporan gabungan: diagnosis (gaps) → resep (suggestions) → catatan jujur
  const report = await generateAnalysisReport({
    cv,
    job,
    rawText,
    language,
    reportLanguage,
    mode,
    rule: {
      matchedMust: rule.matchedMust,
      missingMust: rule.missingMust,
      missingNice: rule.missingNice,
      impliedMust: rule.impliedMust,
      impliedNice: rule.impliedNice,
      // Bahan baku gap "presentation": requirement yang tidak cocok secara kata
      // harfiah, tapi buktinya sudah ditemukan kode di CV.
      presentationHints: rule.presentationHints,
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
    keywordGaps: buildKeywordGaps(rule.impliedMust, rule.impliedNice),
    language,
    reportLanguage,
    engineVersion: ENGINE_VERSION,
    promptVersion: PROMPT_VERSION,
  }
}
