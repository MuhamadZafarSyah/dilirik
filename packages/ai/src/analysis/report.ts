import {
  analysisReportSchema,
  type CvStructured,
  type Gap,
  type JobParsed,
  type Suggestion,
  type SuggestionMode,
} from "@dilirik/shared"
import { generateStructured } from "../generateStructured"
import {
  dedupeSuggestions,
  normalize,
  postCheckAnchor,
  postCheckBannedPhrases,
  postCheckGapPhrases,
  postCheckNaturalPhrasing,
  postCheckSuggestion,
  postCheckUsefulness,
  squashWhitespace,
  stripBannedSentences,
  type PostCheckResult,
} from "../guardrail/postCheck"
import { alignQuote } from "../guardrail/quoteLocator"
import { findConceptEvidence } from "../scoring/conceptEvidence"
import { expandSkill } from "../scoring/skillAliases"
import { buildReportSystemPrompt } from "./reportPrompt"

export type ReportOutcome = {
  gaps: Gap[]
  suggestions: Suggestion[]
  rejected: Array<{ suggestion: Suggestion; reason: string }>
  careerNote: string
}

/** Bentuk minimal yang dibutuhkan dari hasil rule-based (dijaga longgar agar mudah diuji). */
type ImpliedInput = {
  skill: string
  confidence: "certain" | "likely"
  evidence: string[]
}

/**
 * Petunjuk bahwa sebuah requirement kemungkinan hanya soal PENYAJIAN.
 * Bentuknya dijaga longgar (sama alasannya dengan ImpliedInput): fungsi ini
 * harus bisa diuji tanpa menjalankan seluruh pipeline scoring.
 */
type PresentationHintInput = {
  skill: string
  term: string
  quote: string
  severity?: "must" | "nice"
}

/**
 * Bobot implikasi saat menghitung coverage mode.
 * Harus konsisten dengan IMPLIED_WEIGHT_FACTOR di scoring/ruleBased.ts.
 */
const IMPLIED_COVERAGE_WEIGHT: Record<"certain" | "likely", number> = {
  certain: 1,
  likely: 0.6,
}

/**
 * Panjang minimum sebuah kutipan bukti agar dianggap meyakinkan.
 * Kutipan sependek satu kata bisa cocok secara kebetulan di CV mana pun.
 */
const MIN_EVIDENCE_CHARS = 8

/**
 * Pilih mode strategi saran secara DETERMINISTIK dari coverage must-have
 * (bukan skor blended — dua profil beda bisa punya blended sama; bukan LLM —
 * tidak bisa "dirayu" dan hasilnya testable & konsisten dengan cache).
 *
 * Engine v3.1: skill yang tercakup lewat implikasi IKUT dihitung. Tanpa ini,
 * CV frontend yang tidak pernah menulis kata "HTML" bisa terlempar dari
 * "optimize" ke "reframe" — seluruh nada laporan berubah jadi "kamu kurang
 * cocok" untuk kandidat yang sebenarnya sangat cocok.
 */
export function pickSuggestionMode(rule: {
  score: number
  matchedMust: string[]
  missingMust: string[]
  impliedMust?: Array<{ confidence: "certain" | "likely" }>
}): SuggestionMode {
  const implied = rule.impliedMust ?? []
  const impliedCredit = implied.reduce(
    (sum, item) => sum + IMPLIED_COVERAGE_WEIGHT[item.confidence],
    0,
  )
  const totalMust = rule.matchedMust.length + rule.missingMust.length + implied.length
  // Lowongan tanpa must-have terdeteksi → pakai skor rule sebagai proxy coverage
  const coverage =
    totalMust === 0 ? rule.score / 100 : (rule.matchedMust.length + impliedCredit) / totalMust
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

const IMPACT_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }

/** Potong kutipan panjang agar kalimat gap tetap enak dibaca. */
function trimQuote(quote: string, max = 150): string {
  const squashed = squashWhitespace(quote)
  return squashed.length <= max ? squashed : `${squashed.slice(0, max).trimEnd()}...`
}

/** Cocokkan sebuah skill ke daftar (toleran: sama, memuat, atau dimuat). */
function looseMatch(a: string, b: string): boolean {
  if (!a || !b) return false
  return a === b || a.includes(b) || b.includes(a)
}

/**
 * SEMUA petunjuk yang cocok untuk satu gap — bukan yang pertama ditemukan.
 *
 * Versi lama mengembalikan satu petunjuk saja, dan itu menentukan kutipan bukti
 * berdasarkan URUTAN, bukan kualitas. Gap "Design System" di uji gold set punya
 * dua petunjuk: entri daftar skill "Shadcn/ui" dan kalimat pengalaman yang
 * menyebut "100+ reusable components". Yang terpilih kebetulan yang pertama.
 */
function matchHints<T extends { skill: string }>(gapSkill: string, hints: T[]): T[] {
  const skill = normalize(gapSkill)
  if (!skill) return []
  return hints.filter((hint) => looseMatch(normalize(hint.skill), skill))
}

/**
 * Seberapa meyakinkan sebuah kutipan sebagai bukti, diukur dalam JUMLAH KATA.
 *
 * Panjang karakter saja tidak cukup: "Shadcn/ui" lolos ambang 8 karakter dengan
 * selisih satu karakter, padahal ia cuma satu entri di daftar skill dan tidak
 * membuktikan apa pun tentang cara kandidat memakainya. Kalimat pengalaman yang
 * memuat istilah yang sama jauh lebih berguna, baik untuk meyakinkan pengguna
 * maupun sebagai jangkar revisi.
 */
function quoteStrength(quote: string): number {
  const squashed = squashWhitespace(quote)
  if (squashed.length < MIN_EVIDENCE_CHARS) return 0
  return squashed.split(" ").filter(Boolean).length
}

/**
 * Bentuk final sebuah kutipan.
 *
 * Bila `rawText` diberikan, kutipan diluruskan ke teks CV asli sehingga hasilnya
 * dijamin bisa disorot di dokumen — dan kutipan yang tidak ditemukan otomatis
 * gugur. Tanpa `rawText`, kutipan dipakai apa adanya; ini dipakai pengujian unit
 * yang tidak membawa dokumen sumber.
 */
function resolveQuote(quote: string, rawText?: string): string | null {
  if (!quote.trim()) return null
  return rawText === undefined ? squashWhitespace(quote) : alignQuote(quote, rawText)
}

/**
 * Pilih kutipan TERKUAT dari beberapa kandidat.
 *
 * Perbandingan memakai `>` sehingga saat kekuatannya seri, kandidat yang lebih
 * dulu disebut yang menang. Pemanggil memanfaatkan itu: petunjuk hasil kode
 * diletakkan sebelum kutipan tulisan model, karena petunjuk dihasilkan dari
 * korpus CV dan tidak mungkin halusinasi.
 */
function strongestQuote(quotes: string[], rawText?: string): string | null {
  let best: string | null = null
  let bestStrength = 0
  for (const quote of quotes) {
    const resolved = resolveQuote(quote, rawText)
    if (!resolved) continue
    const strength = quoteStrength(resolved)
    if (strength > bestStrength) {
      bestStrength = strength
      best = resolved
    }
  }
  return best
}

/** Varian `strongestQuote` yang ikut mengembalikan petunjuk asalnya. */
function strongestHint<T extends PresentationHintInput>(
  hints: T[],
  rawText?: string,
): { hint: T; quote: string } | null {
  let best: { hint: T; quote: string } | null = null
  let bestStrength = 0
  for (const hint of hints) {
    const resolved = resolveQuote(hint.quote, rawText)
    if (!resolved) continue
    const strength = quoteStrength(resolved)
    if (strength > bestStrength) {
      bestStrength = strength
      best = { hint, quote: resolved }
    }
  }
  return best
}

/** Nama gap yang diklaim sebuah saran, sudah dibersihkan dari entri kosong. */
function claimedGaps(suggestion: Suggestion): string[] {
  return (suggestion.addressesGap ?? []).map((claim) => claim.trim()).filter(Boolean)
}

function findGap(gaps: Gap[], claim: string): Gap | undefined {
  const needle = normalize(claim)
  if (!needle) return undefined
  return gaps.find((gap) => looseMatch(normalize(gap.skill), needle))
}

/** Saran tidak boleh menyebut gap yang tidak ada di diagnosisnya sendiri. */
function checkGapLink(suggestion: Suggestion, gaps: Gap[]): PostCheckResult {
  for (const claim of claimedGaps(suggestion)) {
    if (findGap(gaps, claim)) continue
    return {
      ok: false,
      reason: `addressesGap "${claim}" tidak ada di daftar gap hasil diagnosis — saran dan diagnosis tidak nyambung`,
    }
  }
  return { ok: true }
}

/**
 * Apakah `after` benar-benar memunculkan gap ini?
 *
 * Dua jalan diterima, supaya saran lintas bahasa tidak ikut tertolak:
 * a) salah satu token nama gap muncul sebagai token di `after`, atau
 * b) `after` memunculkan istilah implementasi dari konsep gap itu yang BELUM
 *    ada di `before` (mis. gap "enkripsi data" dijawab dengan "encryption").
 */
function deliversGap(gap: Gap, suggestion: Suggestion): boolean {
  const tokens = normalize(gap.skill)
    .split(" ")
    .filter((tok) => tok.length >= 3)
  if (tokens.length === 0) return true

  const afterTokens = new Set(normalize(suggestion.after).split(" "))
  if (tokens.some((tok) => afterTokens.has(tok))) return true

  const beforeText = normalize(suggestion.before)
  return findConceptEvidence(gap.skill, [suggestion.after]).some(
    (evidence) => !beforeText.includes(evidence.term),
  )
}

/**
 * Guardrail titik-7 / PENGANTARAN (engine v3.2, diperketat v3.2.3).
 *
 * Saran boleh mengaku menjawab gap tertentu, tapi harus benar-benar mengantarnya.
 * Uji gold set #02 meloloskan saran yang mengaku menjawab gap OCR sementara yang
 * ditambahkan justru ", integrating REST APIs for seamless data flow".
 *
 * v3.2.3 menutup lubang yang lebih halus. Ketika `addressesGap` masih berupa satu
 * string bebas, model menulis "OCR, Enkripsi Data" dan pemeriksaan ini hanya
 * mencari SATU gap yang cocok secara longgar — kata "OCR" tersubstring di
 * dalamnya, gap ditemukan, klaim kedua lolos tanpa pernah diuji. Sekarang tiap
 * elemen array diperiksa sendiri-sendiri, dan satu elemen yang tidak terantar
 * membatalkan seluruh saran. Sengaja keras: saran yang setengah benar lebih
 * berbahaya daripada saran yang tidak ada, karena pengguna menerapkannya utuh.
 */
function checkGapDelivered(suggestion: Suggestion, gaps: Gap[]): PostCheckResult {
  for (const claim of claimedGaps(suggestion)) {
    const gap = findGap(gaps, claim)
    // Gap tak dikenal sudah ditangani checkGapLink — jangan menolak dua kali.
    if (!gap) continue
    if (deliversGap(gap, suggestion)) continue
    return {
      ok: false,
      reason: `Mengaku menjawab gap "${gap.skill}", tapi istilahnya tidak muncul di \`after\` — gap-nya tidak benar-benar terjawab`,
    }
  }
  return { ok: true }
}

/**
 * Penjaga TERAKHIR untuk gap tersirat — deterministik, tidak bisa dirayu.
 *
 * Prompt sudah melarang keras, tapi larangan yang cuma hidup di prompt akan
 * bocor cepat atau lambat (persis riwayat banned phrase). Apa pun yang ditulis
 * model, skill yang ada di daftar implikasi tidak akan pernah sampai ke mata
 * user sebagai kekurangan.
 */
export function dropImpliedGaps(gaps: Gap[], implied: ImpliedInput[]): Gap[] {
  if (implied.length === 0) return gaps
  const impliedSkills = implied.map((item) => normalize(item.skill)).filter(Boolean)
  return gaps.filter((gap) => {
    const skill = normalize(gap.skill)
    if (!skill) return true
    return !impliedSkills.some((candidate) => looseMatch(candidate, skill))
  })
}

/**
 * Verifikasi kutipan bukti pada gap "presentation" (engine v3.2).
 *
 * Klaim "faktanya sudah ada di CV" hanya bernilai kalau kutipannya benar. Kalau
 * kutipannya tidak ada di teks CV, ada dua kemungkinan: model mengarang, atau
 * model benar tapi salah mengutip. Karena itu gap tanpa bukti apa pun
 * DITURUNKAN jadi "real", bukan dibuang — membuangnya berarti menyembunyikan
 * requirement lowongan dari user.
 *
 * Engine v3.2a: pencocokannya diserahkan ke quoteLocator, dan yang DISIMPAN
 * adalah potongan rawText hasil pelokalan, bukan tulisan model.
 *
 * Engine v3.2.3: pemilihan kutipan tidak lagi berdasarkan urutan. Dulu kutipan
 * model dicoba lebih dulu dan petunjuk hasil kode hanya jadi cadangan; akibatnya
 * gap "Design System" memajang kutipan "Shadcn/ui" — sembilan karakter, lolos
 * ambang dengan selisih satu — padahal ada kalimat pengalaman yang menyebut
 * "100+ reusable components" dan jauh lebih membuktikan. Sekarang semua kandidat
 * diadu dan yang TERKUAT yang dipakai, dengan petunjuk kode menang saat seri.
 */
export function enforceGapEvidence(
  gaps: Gap[],
  rawText: string,
  hints: PresentationHintInput[] = [],
): Gap[] {
  return gaps.map((gap) => {
    if (gap.type !== "presentation") return gap

    const candidates = [
      ...matchHints(gap.skill, hints).map((hint) => hint.quote),
      gap.evidenceQuote ?? "",
    ]
    const best = strongestQuote(candidates, rawText)
    if (best) return { ...gap, evidenceQuote: best }

    return {
      ...gap,
      type: "real" as const,
      fixability: "requires_experience" as const,
      evidenceQuote: "",
    }
  })
}

/**
 * Naikkan gap "real" menjadi "presentation" bila kode SUDAH menemukan buktinya
 * di CV (engine v3.2).
 *
 * Ini pasangan dari dropImpliedGaps, dan alasannya sama: larangan yang cuma
 * hidup di prompt akan bocor. Uji gold set #02 membuktikannya — lima requirement
 * yang faktanya jelas ada di CV (PaddleOCR, ApexCharts, MediaPipe, AES-256-GCM,
 * 100+ komponen reusable) tetap keluar sebagai "tidak ada pengalaman".
 *
 * Efek sampingnya penting: gap yang naik jadi "presentation" otomatis berubah
 * fixability menjadi "fixable_by_editing", sehingga BOLEH melahirkan saran
 * revisi.
 *
 * `rawText` opsional dengan sengaja. Bila diberikan (jalur produksi), petunjuk
 * diluruskan dulu ke dokumen asli sehingga gap hasil kenaikan tidak pernah
 * memajang kutipan yang tak bisa disorot. Bila tidak (pengujian unit), petunjuk
 * dipakai apa adanya.
 *
 * Catatan bahasa (v3.3.0): explanation & advice di sini ditulis kode, bukan
 * model, jadi keduanya SELALU berbahasa Indonesia. Ini konsisten dengan default
 * bahasa laporan; kalau nanti bahasa laporan bisa lebih dari dua, kalimat ini
 * ikut perlu dilokalkan.
 */
export function promoteHintedGaps(
  gaps: Gap[],
  hints: PresentationHintInput[],
  rawText?: string,
): Gap[] {
  if (hints.length === 0) return gaps
  return gaps.map((gap) => {
    if (gap.type !== "real") return gap
    const best = strongestHint(matchHints(gap.skill, hints), rawText)
    if (!best) return gap
    return {
      ...gap,
      type: "presentation" as const,
      fixability: "fixable_by_editing" as const,
      evidenceQuote: best.quote,
      explanation: `Lowongan memakai istilah "${gap.skill}", dan CV tidak pernah menuliskannya persis begitu. Tapi faktanya ADA: "${trimQuote(best.quote)}". Jadi ini bukan soal kemampuan, melainkan soal kata yang tidak pernah muncul — termasuk di mata filter ATS yang mencocokkan istilah secara harfiah.`,
      advice: `Sebut "${gap.skill}" secara eksplisit di baris yang sudah ada itu, di samping ${best.hint.term}, dan tambahkan ke daftar skill. Tidak ada fakta baru yang perlu dikarang — hanya menamai yang sudah dikerjakan.`,
    }
  })
}

/**
 * Timpa teks gap yang cuma hasil mengisi cetakan (engine v3.2).
 *
 * Gap-nya TIDAK dibuang — skill yang memang tidak ada tetap harus dilaporkan.
 * Yang diganti hanya kalimatnya: dari cetakan yang bisa ditulis tanpa membaca CV
 * menjadi kalimat yang menyebut istilah apa saja yang benar-benar dicari.
 */
export function repairTemplateGaps(gaps: Gap[]): Gap[] {
  return gaps.map((gap) => {
    if (postCheckGapPhrases(gap).ok) return gap

    const searched = gap.searchedFor.length > 0 ? gap.searchedFor : expandSkill(normalize(gap.skill))
    const terms = [...new Set(searched.map((term) => term.trim()).filter(Boolean))].slice(0, 6)
    const scope = gap.severity === "must" ? "syarat wajib" : "nilai tambah"
    const searchedText =
      terms.length > 0
        ? ` Istilah yang dicari di CV: ${terms.join(", ")} — tidak satu pun muncul di daftar skill, kalimat pengalaman, maupun pencapaian.`
        : " Setelah menyisir daftar skill, kalimat pengalaman, dan pencapaian, tidak ada jejaknya."

    return {
      ...gap,
      explanation: `Lowongan menyebut ${gap.skill} sebagai ${scope}.${searchedText}`,
      advice:
        gap.fixability === "fixable_by_editing"
          ? `Faktanya sudah ada di CV — sebut ${gap.skill} secara eksplisit di baris yang relevan agar terbaca manusia maupun ATS.`
          : `Ini tidak bisa ditambal dengan menyunting teks. Yang paling cepat membuktikannya: kerjakan satu bagian nyata yang memakai ${gap.skill}, lalu tulis hasilnya dengan angka di CV.`,
    }
  })
}

/**
 * Luruskan jangkar `before` ke bentuk yang benar-benar ada di teks CV
 * (engine v3.2a).
 *
 * Model mengutip dari structuredJson yang ikut dikirim ke prompt, sedangkan
 * jangkar dipakai untuk auto-replace di teks asli. Dua sumber itu tidak selalu
 * identik karakter demi karakter: ekstraksi PDF menyisipkan pergantian baris,
 * dash non-ASCII, dan kutip melengkung.
 *
 * Memperbaiki lebih baik daripada menolak: posisi kutipannya sudah diketahui,
 * jadi menolaknya tidak menyelamatkan siapa pun. Yang tidak bisa dilokalisasi
 * dibiarkan apa adanya — itu memang tugas postCheckAnchor untuk menolak.
 */
export function alignSuggestionAnchors(
  suggestions: Suggestion[],
  rawText: string,
): Suggestion[] {
  return suggestions.map((suggestion) => {
    const canonical = alignQuote(suggestion.before ?? "", rawText)
    if (canonical === null || canonical === suggestion.before) return suggestion
    return { ...suggestion, before: canonical }
  })
}

/**
 * Laporan analisis GABUNGAN (engine v2): gaps + suggestions + careerNote dari
 * SATU panggilan LLM — satu rantai pemikiran (diagnosis → resep), tidak bisa
 * saling bertentangan, dan hemat token (CV+lowongan cukup dikirim sekali).
 *
 * Engine v3: setiap saran melewati guardrail berurutan — jangkar verbatim,
 * kejujuran fakta, frasa terlarang, kebergunaan, dan keterhubungan ke gap —
 * lalu didedup dan dibatasi sesuai mode.
 *
 * Engine v3.1: daftar gap dibersihkan dulu dari skill yang sudah tercakup lewat
 * implikasi sebelum guardrail saran jalan.
 *
 * Engine v3.2: diagnosis melewati EMPAT tahap deterministik — buang gap
 * tersirat, verifikasi kutipan bukti, naikkan gap yang buktinya sudah ditemukan
 * kode, lalu timpa teks yang masih berupa cetakan.
 *
 * Engine v3.2a: jangkar saran diluruskan dulu ke teks CV asli, dan seluruh
 * pencocokan kutipan memakai satu implementasi bersama (quoteLocator).
 *
 * Engine v3.2.3: teks prompt pindah ke `reportPrompt.ts` supaya berkas ini murni
 * berisi pemeriksaan; kutipan bukti dipilih berdasarkan kekuatan, bukan urutan;
 * dan setiap elemen `addressesGap` diverifikasi satu per satu.
 *
 * Engine v3.3.0: `language` (bahasa CV) dan `reportLanguage` (bahasa penjelasan
 * yang dibaca pengguna) jadi dua parameter terpisah. Keduanya dulu satu nilai,
 * sehingga CV berbahasa Inggris memaksa seluruh laporan berbahasa Inggris
 * walaupun antarmukanya berbahasa Indonesia. Ditambah guardrail kesembilan yang
 * menolak saran yang seluruh perubahannya cuma menempelkan istilah dalam kurung.
 *
 * Engine v3.3.1: `careerNote` akhirnya ikut disaring frasa klise. Selama ini
 * pemeriksaan itu hanya menyentuh `after` sebuah saran, sehingga careerNote jadi
 * satu-satunya celah yang tersisa — dan memang dari sanalah "strong background"
 * masih sampai ke pengguna.
 */
export async function generateAnalysisReport(args: {
  cv: CvStructured
  job: JobParsed
  rawText: string
  /** Bahasa CV — menentukan bahasa `before`, `after`, dan seluruh kutipan. */
  language: string
  /** Bahasa penjelasan. Default ke bahasa CV agar pemanggil lama tidak berubah perilaku. */
  reportLanguage?: string
  mode: SuggestionMode
  rule: {
    matchedMust: string[]
    missingMust: string[]
    missingNice: string[]
    impliedMust?: ImpliedInput[]
    impliedNice?: ImpliedInput[]
    presentationHints?: PresentationHintInput[]
  }
}): Promise<ReportOutcome> {
  const { cv, job, rawText, language, mode, rule } = args
  const reportLanguage = args.reportLanguage ?? language
  const implied = [...(rule.impliedMust ?? []), ...(rule.impliedNice ?? [])]
  const hints = rule.presentationHints ?? []

  const result = await generateStructured({
    schema: analysisReportSchema,
    system: buildReportSystemPrompt({ reportLanguage, cvLanguage: language, mode }),
    // Sedikit lebih tinggi dari default: menulis ulang kalimat butuh variasi,
    // sementara seluruh kebenarannya sudah dikunci schema + guardrail.
    temperature: 0.35,
    prompt: [
      "## Teks CV asli (sumber kutipan `before`, `basedOnFacts` & `evidenceQuote` — verbatim)",
      rawText,
      "## CV (structured JSON)",
      JSON.stringify(cv),
      "## Lowongan (parsed JSON)",
      JSON.stringify(job),
      "## Hasil rule-based (harus konsisten dengan ini)",
      JSON.stringify({
        matchedMust: rule.matchedMust,
        impliedCovered: implied.map((item) => ({
          skill: item.skill,
          sudahDipastikanDariSkill: item.evidence,
        })),
        missingMust: rule.missingMust,
        missingNice: rule.missingNice,
        modeSaran: mode,
      }),
      hints.length > 0
        ? [
            "## KEMUNGKINAN HANYA SOAL PENYAJIAN (sistem sudah menemukan buktinya di CV)",
            'Ini bukan kekurangan kemampuan. Requirement di bawah TIDAK cocok secara kata harfiah, tapi kode sudah menemukan fakta terkait di CV. Klasifikasikan sebagai type "presentation" dan pakai kutipan di bawah sebagai evidenceQuote.',
            JSON.stringify(
              hints.map((hint) => ({
                requirement: hint.skill,
                istilahYangDipakaiKandidat: hint.term,
                buktiDiCv: hint.quote,
              })),
            ),
          ].join("\n")
        : "",
      "Hasilkan laporan { gaps, suggestions, careerNote } sesuai seluruh aturan di atas.",
    ]
      .filter(Boolean)
      .join("\n"),
  })

  // Bersihkan diagnosis SEBELUM guardrail saran jalan, supaya saran yang
  // menggantung pada gap palsu ikut tersaring oleh checkGapLink.
  // Urutannya penting: verifikasi kutipan model dulu, baru penimpaan
  // deterministik, supaya hasil kode tidak dibatalkan oleh pemeriksaan kutipan.
  let gaps = dropImpliedGaps(result.gaps, implied)
  gaps = enforceGapEvidence(gaps, rawText, hints)
  gaps = promoteHintedGaps(gaps, hints, rawText)
  gaps = repairTemplateGaps(gaps)

  const rejected: ReportOutcome["rejected"] = []
  const passed: Suggestion[] = []

  // Luruskan jangkar dulu, baru dinilai — supaya yang ditolak postCheckAnchor
  // benar-benar jangkar yang tidak ada di CV, bukan sekadar beda tanda baca.
  const ordered = alignSuggestionAnchors(result.suggestions, rawText).sort(
    (a, b) => (IMPACT_ORDER[a.impact] ?? 1) - (IMPACT_ORDER[b.impact] ?? 1),
  )

  for (const suggestion of ordered) {
    const checks: PostCheckResult[] = [
      postCheckAnchor(suggestion, rawText),
      postCheckSuggestion(suggestion, cv),
      postCheckBannedPhrases(suggestion),
      postCheckNaturalPhrasing(suggestion),
      postCheckUsefulness(suggestion, job),
      checkGapLink(suggestion, gaps),
      checkGapDelivered(suggestion, gaps),
    ]
    const failed = checks.find(
      (check): check is { ok: false; reason: string } => !check.ok,
    )
    if (failed) {
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
    gaps,
    suggestions: kept.slice(0, limit),
    rejected,
    careerNote: stripBannedSentences(result.careerNote.trim()),
  }
}
