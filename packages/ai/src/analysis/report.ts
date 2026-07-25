import {
  analysisReportSchema,
  type CvStructured,
  type Gap,
  type JobParsed,
  type Suggestion,
  type SuggestionMode,
} from "@dilirik/shared"
import { generateStructured } from "../generateStructured"
import { HONESTY_SYSTEM_PROMPT, languageInstruction } from "../guardrail/systemPrompt"
import { postCheckSuggestion, postCheckUsefulness } from "../guardrail/postCheck"

export type ReportOutcome = {
  gaps: Gap[]
  suggestions: Suggestion[]
  rejected: Array<{ suggestion: Suggestion; reason: string }>
  careerNote: string
}

/**
 * Pilih mode strategi saran secara DETERMINISTIK dari coverage must-have
 * (bukan skor blended — dua profil beda bisa punya blended sama; bukan LLM —
 * tidak bisa "dirayu" dan hasilnya testable & konsisten dengan cache).
 */
export function pickSuggestionMode(rule: {
  score: number
  matchedMust: string[]
  missingMust: string[]
}): SuggestionMode {
  const totalMust = rule.matchedMust.length + rule.missingMust.length
  // Lowongan tanpa must-have terdeteksi → pakai skor rule sebagai proxy coverage
  const coverage = totalMust === 0 ? rule.score / 100 : rule.matchedMust.length / totalMust
  if (coverage >= 0.6) return "optimize"
  if (coverage >= 0.25) return "reframe"
  return "honest_pivot"
}

const MODE_INSTRUCTIONS: Record<SuggestionMode, string> = {
  optimize: `MODE SARAN: OPTIMIZE — CV sudah satu bidang dengan lowongan.
Perkuat bullet yang paling relevan: pakai istilah dari lowongan yang MEMANG didukung fakta CV, action verb, dan angka dampak yang SUDAH ada di CV. Maksimal 6 saran, urutkan dari yang paling berdampak.`,
  reframe: `MODE SARAN: REFRAME — CV cocok sebagian.
Prioritas: reposisi. Tulis ulang PROFILE/summary agar mengarah ke target lowongan, tonjolkan transferable skills yang menjawab requirement. JANGAN memoles bullet yang tidak relevan dengan lowongan ini. Maksimal 5 saran.`,
  honest_pivot: `MODE SARAN: HONEST PIVOT — bidang CV BERBEDA dengan bidang lowongan.
JANGAN memoles bullet yang tidak relevan — itu membuang waktu user dan menyesatkan. HANYA buat saran "jembatan": revisi yang menghubungkan fakta yang SUNGGUH ada di CV dengan requirement lowongan (mis. tools/AI/bahasa/lokasi yang kebetulan diminta), dan akui di kalimatnya bahwa jembatan itu parsial. Maksimal 3 saran. Jika tidak ada jembatan jujur, kembalikan suggestions: [] — ARRAY KOSONG ADALAH JAWABAN YANG BENAR. WAJIB isi careerNote dengan penjelasan jujur apa yang sebenarnya dibutuhkan lowongan ini (mis. portofolio karya, pengalaman nyata) — bukan basa-basi.`,
}

/**
 * Laporan analisis GABUNGAN (engine v2): gaps + suggestions + careerNote dari
 * SATU panggilan LLM — satu rantai pemikiran (diagnosis → resep), tidak bisa
 * saling bertentangan, dan hemat token (CV+lowongan cukup dikirim sekali).
 * Setiap saran lalu melewati DUA guardrail: kejujuran (fakta CV) dan
 * kebergunaan (relevansi ke lowongan, anti no-op/kosmetik).
 */
export async function generateAnalysisReport(args: {
  cv: CvStructured
  job: JobParsed
  rawText: string
  language: string
  mode: SuggestionMode
  rule: { matchedMust: string[]; missingMust: string[]; missingNice: string[] }
}): Promise<ReportOutcome> {
  const { cv, job, rawText, language, mode, rule } = args

  const system = [
    HONESTY_SYSTEM_PROMPT,
    languageInstruction(language),
    `Kamu menghasilkan SATU laporan utuh { gaps, suggestions, careerNote } — semuanya harus SATU pemikiran dan tidak boleh saling bertentangan: saran hanya boleh lahir dari gap yang bisa dijawab dengan revisi teks.`,
    `ATURAN GAPS:
- severity: "must" jika dari requirement wajib lowongan, "nice" jika nice-to-have/plus point.
- fixability: "fixable_by_editing" HANYA jika faktanya sudah ada di CV dan tinggal disajikan; "requires_experience" jika jujur butuh pengalaman/belajar nyata (JANGAN beri advice template "ikut kursus" berulang — beri langkah spesifik & realistis, atau akui tidak bisa ditambal tulisan); "fit_constraint" untuk faktor non-skill (atribut personal, identitas, lokasi) — tulis netral & sensitif, TANPA menyarankan mengubah diri.
- HANYA gap ber-fixability "fixable_by_editing" yang boleh melahirkan suggestion.`,
    `ATURAN SUGGESTIONS:
- before = KUTIPAN VERBATIM dari "Teks CV asli" — persis karakter demi karakter (tanda baca & kapitalisasi) agar bisa diganti otomatis.
- basedOnFacts = kutipan VERBATIM potongan teks CV (bukan parafrase seperti "team collaboration" — kutip "with the team").
- targetRequirement = kutip requirement lowongan yang dijawab saran ini. Saran tanpa target akan DIBUANG.
- after harus menambah relevansi nyata terhadap lowongan — bukan sinonim/parafrase.
- DILARANG kata sifat memuji diri: "highly skilled", "expert", "strong background", "showcasing expertise", dsb — recruiter membencinya dan ATS tidak membacanya.
- Pertahankan present tense untuk pekerjaan yang masih berjalan (mis. "May 2025 - Present").
- Kualitas > kuantitas: suggestions [] adalah output valid jika tidak ada saran yang jujur DAN relevan.`,
    `ATURAN CAREERNOTE: 1-3 kalimat, nada teman yang peduli dan jujur. Wajib terisi di mode reframe/honest_pivot (jelaskan posisi kandidat terhadap lowongan ini apa adanya). Boleh string kosong "" di mode optimize jika tidak ada catatan penting.`,
    MODE_INSTRUCTIONS[mode],
  ].join("\n\n")

  const result = await generateStructured({
    schema: analysisReportSchema,
    system,
    prompt: [
      "## Teks CV asli (sumber kutipan `before` & `basedOnFacts` — verbatim)",
      rawText,
      "## CV (structured JSON)",
      JSON.stringify(cv),
      "## Lowongan (parsed JSON)",
      JSON.stringify(job),
      "## Hasil rule-based (harus konsisten dengan ini)",
      JSON.stringify({
        matchedMust: rule.matchedMust,
        missingMust: rule.missingMust,
        missingNice: rule.missingNice,
        modeSaran: mode,
      }),
      "Hasilkan laporan { gaps, suggestions, careerNote } sesuai seluruh aturan di atas.",
    ].join("\n"),
  })

  const suggestions: Suggestion[] = []
  const rejected: ReportOutcome["rejected"] = []
  for (const suggestion of result.suggestions) {
    const honesty = postCheckSuggestion(suggestion, cv)
    if (!honesty.ok) {
      rejected.push({ suggestion, reason: honesty.reason })
      continue
    }
    const usefulness = postCheckUsefulness(suggestion, job)
    if (!usefulness.ok) {
      rejected.push({ suggestion, reason: usefulness.reason })
      continue
    }
    suggestions.push(suggestion)
  }

  return { gaps: result.gaps, suggestions, rejected, careerNote: result.careerNote.trim() }
}
