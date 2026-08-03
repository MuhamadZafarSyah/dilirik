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
import {
  dedupeSuggestions,
  normalize,
  postCheckAnchor,
  postCheckBannedPhrases,
  postCheckSuggestion,
  postCheckUsefulness,
  type PostCheckResult,
} from "../guardrail/postCheck"

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

/** Batas jumlah saran per mode — ditegakkan di KODE, bukan sekadar diminta di prompt. */
const MODE_MAX_SUGGESTIONS: Record<SuggestionMode, number> = {
  optimize: 6,
  reframe: 5,
  honest_pivot: 3,
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
 * Few-shot — satu contoh benar + tiga mode gagal yang paling sering muncul.
 * Contoh konkret jauh lebih efektif daripada menambah kalimat larangan.
 */
const FEW_SHOT = `## CONTOH (pelajari polanya, jangan disalin isinya)

### CONTOH BAIK
Fakta CV: "Mengelola akun Instagram organisasi kampus, follower naik dari 800 ke 2.400 dalam 6 bulan"
Requirement lowongan: "Mampu menyusun konten media sosial dan membaca performa konten"
{
  "section": "experience",
  "before": "Mengelola akun Instagram organisasi kampus, follower naik dari 800 ke 2.400 dalam 6 bulan",
  "after": "Mengelola akun Instagram organisasi kampus (3 posting/minggu): follower naik 800 → 2.400 dalam 6 bulan, dengan evaluasi performa konten mingguan",
  "basedOnFacts": ["follower naik dari 800 ke 2.400 dalam 6 bulan"],
  "targetRequirement": "menyusun konten media sosial dan membaca performa konten",
  "addressesGap": "Analisis performa konten",
  "whatChanged": ["added_scope", "added_outcome"],
  "rationale": "Angka pertumbuhan sudah ada di CV tapi tenggelam; kadensi & evaluasi mingguan menjawab requirement secara eksplisit.",
  "impact": "high"
}

### CONTOH BURUK 1 — KOSMETIK (parafrase tanpa informasi baru)
"before": "Membantu tim marketing membuat konten"
"after": "Berkontribusi aktif membantu tim marketing dalam pembuatan konten"
SALAH: tidak ada informasi baru, cuma kata hiasan. Recruiter tidak mendapat apa pun. JANGAN kirim saran seperti ini — lebih baik tidak ada saran.

### CONTOH BURUK 2 — KEYWORD STUFFING
"after": "Membuat konten menggunakan SEO, SEM, Google Ads, Meta Ads, dan CRM untuk tim marketing"
SALAH: menempelkan istilah lowongan yang TIDAK ADA buktinya di CV. Ini berbohong, dan akan hancur di interview.

### CONTOH BURUK 3 — MEMUJI DIRI
"after": "Highly skilled content creator dengan strong background di digital marketing"
SALAH: kata sifat memuji diri tidak bisa diverifikasi, tidak dibaca ATS, dan otomatis DITOLAK sistem.`

const IMPACT_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }

/** Saran tidak boleh menyebut gap yang tidak ada di diagnosisnya sendiri. */
function checkGapLink(suggestion: Suggestion, gaps: Gap[]): PostCheckResult {
  const claim = normalize(suggestion.addressesGap ?? "")
  if (!claim) return { ok: true }
  const known = gaps.some((gap) => {
    const skill = normalize(gap.skill)
    return skill === claim || skill.includes(claim) || claim.includes(skill)
  })
  return known
    ? { ok: true }
    : {
        ok: false,
        reason: `addressesGap "${suggestion.addressesGap}" tidak ada di daftar gap hasil diagnosis — saran dan diagnosis tidak nyambung`,
      }
}

/**
 * Laporan analisis GABUNGAN (engine v2): gaps + suggestions + careerNote dari
 * SATU panggilan LLM — satu rantai pemikiran (diagnosis → resep), tidak bisa
 * saling bertentangan, dan hemat token (CV+lowongan cukup dikirim sekali).
 *
 * Engine v3: setiap saran melewati LIMA guardrail berurutan — jangkar verbatim,
 * kejujuran fakta, frasa terlarang, kebergunaan (verifikasi klaim whatChanged),
 * dan keterhubungan ke gap — lalu didedup dan dibatasi sesuai mode.
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
    `LANGKAH WAJIB SEBELUM MENULIS SETIAP \`after\`:
1. Cari ke SELURUH teks CV apakah ada ANGKA yang berhubungan dengan bullet ini (jumlah orang, durasi, frekuensi, persentase, nominal, jumlah proyek). Angka yang sudah ada tapi tercecer di bagian lain CV BOLEH dipindahkan ke bullet ini.
2. Kalau tidak ada satu pun angka, cari CAKUPAN konkret (berapa banyak, untuk siapa, seberapa sering, dengan tools apa) yang sudah tertulis di CV.
3. Kalau dua-duanya tidak ada, JANGAN mengarang angka. Lebih baik saran ini tidak dibuat.`,
    `ATURAN SUGGESTIONS:
- before = KUTIPAN VERBATIM dari "Teks CV asli" — persis karakter demi karakter (tanda baca & kapitalisasi). Sistem MENOLAK otomatis saran yang \`before\`-nya tidak ditemukan verbatim.
- basedOnFacts = kutipan VERBATIM potongan teks CV (bukan parafrase seperti "team collaboration" — kutip "with the team").
- targetRequirement = kutip requirement lowongan yang dijawab saran ini. Saran tanpa target akan DIBUANG.
- addressesGap = isi dengan \`skill\` dari salah satu gap yang kamu tulis sendiri di atas. Harus sama persis.
- whatChanged = klaim perubahan yang bisa DIBUKTIKAN dari teksmu sendiri. Sistem memverifikasi: "added_metric" wajib memunculkan angka baru di \`after\`; "added_tool" wajib memunculkan istilah lowongan yang benar-benar bertambah. Klaim palsu = saran DIBUANG.
- rationale = 1 kalimat: kenapa perubahan ini menaikkan peluang untuk lowongan INI.
- impact = "high" hanya untuk saran yang menjawab requirement WAJIB yang sedang lemah.
- DILARANG kata sifat memuji diri: "highly skilled", "expert in", "strong background", "showcasing expertise", "pekerja keras", "sangat ahli", dsb — divalidasi otomatis dan langsung ditolak.
- Pertahankan present tense untuk pekerjaan yang masih berjalan (mis. "May 2025 - Present").
- Dua saran DILARANG memakai potongan \`before\` yang sama atau saling tumpang tindih.
- Kualitas > kuantitas: suggestions [] adalah output valid jika tidak ada saran yang jujur DAN relevan.`,
    `ATURAN CAREERNOTE: 1-3 kalimat, nada teman yang peduli dan jujur. Wajib terisi di mode reframe/honest_pivot (jelaskan posisi kandidat terhadap lowongan ini apa adanya). Boleh string kosong "" di mode optimize jika tidak ada catatan penting.`,
    MODE_INSTRUCTIONS[mode],
    FEW_SHOT,
  ].join("\n\n")

  const result = await generateStructured({
    schema: analysisReportSchema,
    system,
    // Sedikit lebih tinggi dari default: menulis ulang kalimat butuh variasi,
    // sementara seluruh kebenarannya sudah dikunci schema + 5 guardrail.
    temperature: 0.35,
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

  const rejected: ReportOutcome["rejected"] = []
  const passed: Suggestion[] = []

  const ordered = [...result.suggestions].sort(
    (a, b) => (IMPACT_ORDER[a.impact] ?? 1) - (IMPACT_ORDER[b.impact] ?? 1),
  )

  for (const suggestion of ordered) {
    const checks: PostCheckResult[] = [
      postCheckAnchor(suggestion, rawText),
      postCheckSuggestion(suggestion, cv),
      postCheckBannedPhrases(suggestion),
      postCheckUsefulness(suggestion, job),
      checkGapLink(suggestion, result.gaps),
    ]
    const failed = checks.find((check) => !check.ok)
    if (failed && !failed.ok) {
      rejected.push({ suggestion, reason: failed.reason })
      continue
    }
    passed.push(suggestion)
  }

  const { kept, dropped } = dedupeSuggestions(passed)
  rejected.push(...dropped)

  const limit = MODE_MAX_SUGGESTIONS[mode]
  for (const extra of kept.slice(limit)) {
    rejected.push({
      suggestion: extra,
      reason: `Melebihi batas ${limit} saran untuk mode ${mode} — dibuang agar user fokus pada yang paling berdampak`,
    })
  }

  return {
    gaps: result.gaps,
    suggestions: kept.slice(0, limit),
    rejected,
    careerNote: result.careerNote.trim(),
  }
}
