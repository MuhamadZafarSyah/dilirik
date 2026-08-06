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
  postCheckGapPhrases,
  postCheckSuggestion,
  postCheckUsefulness,
  squashWhitespace,
  type PostCheckResult,
} from "../guardrail/postCheck"
import { alignQuote } from "../guardrail/quoteLocator"
import { findConceptEvidence } from "../scoring/conceptEvidence"
import { expandSkill } from "../scoring/skillAliases"

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

const MODE_INSTRUCTIONS: Record<SuggestionMode, string> = {
  optimize: `MODE SARAN: OPTIMIZE — CV sudah satu bidang dengan lowongan.
Perkuat bullet yang paling relevan: pakai istilah dari lowongan yang MEMANG didukung fakta CV, action verb, dan angka dampak yang SUDAH ada di CV. Maksimal 6 saran, urutkan dari yang paling berdampak.`,
  reframe: `MODE SARAN: REFRAME — CV cocok sebagian.
Prioritas: reposisi. Tulis ulang PROFILE/summary agar mengarah ke target lowongan, tonjolkan transferable skills yang menjawab requirement. JANGAN memoles bullet yang tidak relevan dengan lowongan ini. Maksimal 5 saran.`,
  honest_pivot: `MODE SARAN: HONEST PIVOT — bidang CV BERBEDA dengan bidang lowongan.
JANGAN memoles bullet yang tidak relevan — itu membuang waktu user dan menyesatkan. HANYA buat saran "jembatan": revisi yang menghubungkan fakta yang SUNGGUH ada di CV dengan requirement lowongan (mis. tools/AI/bahasa/lokasi yang kebetulan diminta), dan akui di kalimatnya bahwa jembatan itu parsial. Maksimal 3 saran. Jika tidak ada jembatan jujur, kembalikan suggestions: [] — ARRAY KOSONG ADALAH JAWABAN YANG BENAR. WAJIB isi careerNote dengan penjelasan jujur apa yang sebenarnya dibutuhkan lowongan ini (mis. portofolio karya, pengalaman nyata) — bukan basa-basi.`,
}

/**
 * Aturan implikasi skill — sengaja ditulis TEGAS dan dengan contoh konkret.
 *
 * Kalimat larangan abstrak terbukti tidak cukup: engine v3 sudah punya
 * HONESTY_SYSTEM_PROMPT dan model tetap memvonis "tidak ada bukti pengalaman
 * HTML" untuk CV yang penuh React dan SvelteKit.
 */
const IMPLICATION_RULES = `ATURAN IMPLIKASI SKILL (WAJIB, PALING SERING DILANGGAR):
Daftar "impliedCovered" di data bawah berisi skill yang SUDAH DIPASTIKAN dikuasai kandidat — disimpulkan dari skill lain yang memang ada di CV-nya. Contoh: orang yang membangun aplikasi React, Vue, atau SvelteKit PASTI menguasai HTML dan CSS, walaupun kata "HTML" tidak pernah muncul satu kali pun di CV.
- DILARANG KERAS menuliskannya sebagai gap dalam bentuk apa pun, termasuk sebagai "presentation".
- DILARANG menulis explanation seperti "tidak ada bukti pengalaman HTML di CV" atau advice seperti "perlu menambahkan pengalaman atau pengetahuan tentang HTML". Kalimat semacam itu SALAH SECARA FAKTUAL dan menghina kandidat yang sudah bertahun-tahun membangun antarmuka.
- Sistem membuang gap semacam ini secara otomatis, dan setiap saran yang menggantung padanya ikut hangus. Jadi menulisnya hanya membuang jatah saranmu.
- Soal kata kunci ATS untuk skill ini sudah ditangani bagian lain di luar laporanmu. Abaikan sepenuhnya.`

/**
 * Langkah CARI-BUKTI sebelum memvonis (engine v3.2).
 *
 * Kandidat gap datang dari pencocokan kata harfiah, dan kalimat "skill lowongan
 * yang tidak terdeteksi di CV" menanamkan premis yang cenderung dikonfirmasi
 * model. Instruksi ini dulu ada di analysis/gaps.ts — file yang ternyata TIDAK
 * PERNAH DIEKSEKUSI (pipeline hanya memanggil generateAnalysisReport), sehingga
 * model tidak pernah menerimanya. Sekarang ia hidup di jalur yang benar.
 */
const EVIDENCE_FIRST_RULES = `LANGKAH WAJIB SEBELUM MENYATAKAN SESUATU TIDAK ADA:
Kandidat gap di data bawah berasal dari pencocokan kata HARFIAH, jadi WAJAR kalau sebagian bukan kekurangan sungguhan. Kamu BOLEH dan HARUS menolak premisnya bila memang begitu — jangan memaksakan penjelasan untuk sesuatu yang sebenarnya sudah dikuasai kandidat.
Untuk SETIAP kandidat, kerjakan urutan ini sebelum memutuskan:
1. Sisir "experiences[].highlights" dan "achievements" satu per satu — bukan hanya daftar skills. Bagian inilah yang paling sering memuat faktanya.
2. Cari juga PADANANNYA, bukan cuma kata yang sama persis: nama tool, nama library, nama teknik, atau singkatannya. Lowongan menulis konsep ("OCR", "data visualization", "enkripsi data"), CV sering menulis implementasinya ("PaddleOCR", "ApexCharts", "AES-256-GCM"). Itu HAL YANG SAMA.
3. Tulis di field "searchedFor" istilah apa saja yang kamu cari di langkah 1-2. Field ini WAJIB terisi untuk setiap gap ber-type "real" dengan severity "must". Kalau kamu tidak bisa menyebut apa yang kamu cari, artinya kamu belum mencari.
4. Baru setelah itu tentukan type-nya.`

/**
 * Definisi gap PENYAJIAN + kewajiban mengutip (engine v3.2).
 *
 * Kewajiban mengutip inilah yang mematikan output isi-blanko: kalimat template
 * bisa dikarang tanpa membaca CV, tapi kutipan verbatim tidak — dan kutipan
 * palsu bisa dideteksi kode (lihat enforceGapEvidence).
 */
const PRESENTATION_RULES = `TIGA TYPE GAP — BEDAKAN DENGAN TELITI:
- "presentation" = FAKTANYA ADA di CV, tapi tidak tersaji sebagai istilah yang dicari lowongan (terkubur di tengah kalimat panjang, atau ditulis sebagai nama tool sementara lowongan menyebut konsepnya). Inilah SATU-SATUNYA type yang bisa langsung diperbaiki dengan menyunting teks, jadi type inilah yang paling berharga untuk user. Cari type ini lebih dulu dan lebih keras daripada dua lainnya.
- "real" = benar-benar tidak ada jejaknya, sekecil apa pun, setelah kamu menjalankan langkah cari-bukti di atas.
- "implied" = sudah dipastikan dikuasai lewat skill lain. Jangan dipakai; daftar impliedCovered sudah ditangani sistem.

UNTUK SETIAP GAP "presentation" WAJIB:
- evidenceQuote = kutipan VERBATIM dari "Teks CV asli", persis karakter demi karakter, yang membuktikan faktanya memang ada. Sistem memverifikasi kutipan ini ke teks CV; kutipan yang tidak ditemukan membuat gap-mu dibatalkan.
- fixability = "fixable_by_editing".
- explanation = sebutkan apa yang SUDAH ADA lalu jelaskan kenapa recruiter/ATS tetap bisa melewatkannya. Jangan berkata seolah kandidat tidak punya kemampuan itu.
- advice = perintah menyunting yang konkret: kata apa yang ditambahkan, di baris yang mana.

DILARANG menulis kalimat cetakan seperti "tidak ada pengalaman atau pengetahuan tentang X di CV" atau "perlu menambahkan pengalaman atau pengetahuan tentang X". Kalimat begitu bisa ditulis tanpa membaca CV sama sekali — itu sebabnya dilarang, dan sistem akan menimpanya.`

/**
 * Few-shot — contoh benar + mode gagal yang paling sering muncul.
 * Contoh konkret jauh lebih efektif daripada menambah kalimat larangan.
 */
const FEW_SHOT = `## CONTOH (pelajari polanya, jangan disalin isinya)

### CONTOH BAIK 1 — SARAN YANG BERGUNA
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

### CONTOH BAIK 2 — GAP PENYAJIAN (INI YANG PALING SERING TERLEWAT)
Requirement lowongan: "OCR" (wajib)
Fakta CV: "Developed the frontend of the Persuratan TNI-AD correspondence management system using SvelteKit and Svelte 5, covering 21 pages and 60+ components, with hardware and camera document capture via PaddleOCR, canvas-based digital signatures, and AES-256-GCM secured sessions with role-based access"
Kata "OCR" tidak berdiri sendiri di CV, tapi "PaddleOCR" ADALAH mesin OCR. Kandidat sudah membangun alur tangkap dokumen dengannya. Menyebut ini "tidak ada pengalaman OCR" adalah SALAH SECARA FAKTUAL.
{
  "type": "presentation",
  "skill": "OCR",
  "severity": "must",
  "fixability": "fixable_by_editing",
  "searchedFor": ["OCR", "PaddleOCR", "Tesseract", "document capture", "ekstraksi teks"],
  "evidenceQuote": "hardware and camera document capture via PaddleOCR",
  "explanation": "Pengalaman OCR-nya sudah ada — alur tangkap dokumen lewat kamera memakai PaddleOCR. Masalahnya kata \\"OCR\\" tidak pernah berdiri sendiri di CV, jadi filter ATS yang mencocokkan istilah secara harfiah bisa melewatkannya.",
  "advice": "Sebut \\"OCR\\" secara eksplisit di baris itu, mis. \\"document capture via PaddleOCR (OCR)\\", dan tambahkan OCR ke daftar skill. Tidak ada fakta baru yang dikarang — hanya menamai yang sudah dikerjakan."
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
SALAH: kata sifat memuji diri tidak bisa diverifikasi, tidak dibaca ATS, dan otomatis DITOLAK sistem.

### CONTOH BURUK 4 — GAP YANG SEBENARNYA SUDAH TERCAKUP
CV: "Membangun frontend platform back-office dengan Nuxt 3, Vue 3, dan TypeScript (13 modul, 170+ komponen)"
Lowongan: "Menguasai HTML, CSS, JavaScript"
{ "type": "real", "skill": "HTML", "explanation": "Tidak ada bukti pengalaman HTML di CV", "advice": "Perlu menambahkan pengalaman HTML" }
SALAH TOTAL: mustahil membangun 170+ komponen Vue tanpa HTML. Gap ini tidak boleh ada. Sistem membuangnya otomatis.

### CONTOH BURUK 5 — SARAN YANG TIDAK MENGANTAR GAP-NYA
"addressesGap": "OCR"
"before": "... document capture via PaddleOCR, canvas-based digital signatures ..."
"after": "... document capture via PaddleOCR, canvas-based digital signatures ..., integrating REST APIs for seamless data flow"
SALAH: mengaku menjawab gap OCR, tapi kata "OCR" tetap tidak muncul di hasil akhirnya — yang ditambah justru REST API yang sudah tercatat cocok. Sistem menolak saran seperti ini secara otomatis.`

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

function matchHint<T extends { skill: string }>(
  gapSkill: string,
  hints: T[],
): T | undefined {
  const skill = normalize(gapSkill)
  if (!skill) return undefined
  return hints.find((hint) => looseMatch(normalize(hint.skill), skill))
}

/** Saran tidak boleh menyebut gap yang tidak ada di diagnosisnya sendiri. */
function checkGapLink(suggestion: Suggestion, gaps: Gap[]): PostCheckResult {
  const claim = normalize(suggestion.addressesGap ?? "")
  if (!claim) return { ok: true }
  const known = gaps.some((gap) => looseMatch(normalize(gap.skill), claim))
  return known
    ? { ok: true }
    : {
        ok: false,
        reason: `addressesGap "${suggestion.addressesGap}" tidak ada di daftar gap hasil diagnosis — saran dan diagnosis tidak nyambung`,
      }
}

/**
 * Guardrail titik-7 / PENGANTARAN (engine v3.2).
 *
 * Saran boleh mengaku menjawab gap tertentu, tapi harus benar-benar mengantarnya.
 * Uji gold set #02 meloloskan saran yang mengaku menjawab gap OCR sementara yang
 * ditambahkan justru ", integrating REST APIs for seamless data flow" — REST API
 * sudah tercatat cocok, dan kata "OCR" tetap tidak muncul. Saran seperti itu
 * memakan jatah saran tanpa memperbaiki apa pun.
 *
 * Dua jalan diterima, supaya saran lintas bahasa tidak ikut tertolak:
 * a) salah satu token nama gap muncul sebagai token di `after`, atau
 * b) `after` memunculkan istilah implementasi dari konsep gap itu yang BELUM
 *    ada di `before` (mis. gap "enkripsi data" dijawab dengan "encryption").
 */
function checkGapDelivered(suggestion: Suggestion, gaps: Gap[]): PostCheckResult {
  const claim = normalize(suggestion.addressesGap ?? "")
  if (!claim) return { ok: true }
  const gap = gaps.find((item) => looseMatch(normalize(item.skill), claim))
  // Gap tak dikenal sudah ditangani checkGapLink — jangan menolak dua kali.
  if (!gap) return { ok: true }

  const tokens = normalize(gap.skill)
    .split(" ")
    .filter((tok) => tok.length >= 3)
  if (tokens.length === 0) return { ok: true }

  const afterTokens = new Set(normalize(suggestion.after).split(" "))
  if (tokens.some((tok) => afterTokens.has(tok))) return { ok: true }

  const beforeText = normalize(suggestion.before)
  const gained = findConceptEvidence(gap.skill, [suggestion.after]).some(
    (evidence) => !beforeText.includes(evidence.term),
  )
  if (gained) return { ok: true }

  return {
    ok: false,
    reason: `Mengaku menjawab gap "${gap.skill}", tapi istilahnya tidak muncul di \`after\` — gap-nya tidak benar-benar terjawab`,
  }
}

/**
 * Penjaga TERAKHIR untuk gap tersirat — deterministik, tidak bisa dirayu.
 *
 * Prompt di atas sudah melarang keras, tapi larangan yang cuma hidup di prompt
 * akan bocor cepat atau lambat (persis riwayat banned phrase). Apa pun yang
 * ditulis model, skill yang ada di daftar implikasi tidak akan pernah sampai ke
 * mata user sebagai kekurangan.
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
 * model benar tapi salah mengutip. Karena itu urutannya: perbaiki dulu dengan
 * bukti deterministik kalau ada, dan hanya kalau tidak ada sama sekali gap itu
 * diturunkan jadi "real" — bukan dibuang, karena membuangnya berarti
 * menyembunyikan requirement lowongan dari user.
 *
 * Engine v3.2a: pencocokannya diserahkan ke quoteLocator, dan yang DISIMPAN
 * adalah potongan rawText hasil pelokalan, bukan tulisan model. Dua akibatnya:
 * kutipan gap dijamin bisa disorot di dokumen asli, dan kutipan dari hints —
 * yang sebelumnya dipakai mentah tanpa pernah diverifikasi ke rawText — ikut
 * diluruskan. Hints berasal dari korpus structuredJson hasil parseCv, yang tidak
 * selalu identik karakter demi karakter dengan teks PDF aslinya.
 */
export function enforceGapEvidence(
  gaps: Gap[],
  rawText: string,
  hints: PresentationHintInput[] = [],
): Gap[] {
  return gaps.map((gap) => {
    if (gap.type !== "presentation") return gap

    const quoted = alignQuote(gap.evidenceQuote ?? "", rawText)
    if (quoted && squashWhitespace(quoted).length >= MIN_EVIDENCE_CHARS) {
      return { ...gap, evidenceQuote: quoted }
    }

    const hint = matchHint(gap.skill, hints)
    // Kutipan hint dihasilkan kode dari korpus CV, jadi bukan halusinasi. Kalau
    // pelokalan gagal, pakai apa adanya daripada menghukum gap yang benar.
    if (hint) {
      return { ...gap, evidenceQuote: alignQuote(hint.quote, rawText) ?? hint.quote }
    }

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
 * revisi. Di uji tadi seluruh gap ber-fixability "requires_experience" terblokir
 * dan hanya menyisakan satu saran — klasifikasi gap adalah tuas di hulunya.
 */
export function promoteHintedGaps(gaps: Gap[], hints: PresentationHintInput[]): Gap[] {
  if (hints.length === 0) return gaps
  return gaps.map((gap) => {
    if (gap.type !== "real") return gap
    const hint = matchHint(gap.skill, hints)
    if (!hint) return gap
    return {
      ...gap,
      type: "presentation" as const,
      fixability: "fixable_by_editing" as const,
      evidenceQuote: hint.quote,
      explanation: `Lowongan memakai istilah "${gap.skill}", dan CV tidak pernah menuliskannya persis begitu. Tapi faktanya ADA: "${trimQuote(hint.quote)}". Jadi ini bukan soal kemampuan, melainkan soal kata yang tidak pernah muncul — termasuk di mata filter ATS yang mencocokkan istilah secara harfiah.`,
      advice: `Sebut "${gap.skill}" secara eksplisit di baris yang sudah ada itu, di samping ${hint.term}, dan tambahkan ke daftar skill. Tidak ada fakta baru yang perlu dikarang — hanya menamai yang sudah dikerjakan.`,
    }
  })
}

/**
 * Timpa teks gap yang cuma hasil mengisi cetakan (engine v3.2).
 *
 * Gap-nya TIDAK dibuang — skill yang memang tidak ada tetap harus dilaporkan.
 * Yang diganti hanya kalimatnya: dari cetakan yang bisa ditulis tanpa membaca CV
 * menjadi kalimat yang menyebut istilah apa saja yang benar-benar dicari. Itu
 * informasi yang bisa diperiksa user, dan berbeda untuk setiap skill.
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
 * dash non-ASCII, dan kutip melengkung. Uji gold set #02 kehilangan saran untuk
 * dua gap gara-gara ini, padahal kalimatnya jelas ada di CV.
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
 * kejujuran fakta, frasa terlarang, kebergunaan (verifikasi klaim whatChanged),
 * dan keterhubungan ke gap — lalu didedup dan dibatasi sesuai mode.
 *
 * Engine v3.1: sebelum guardrail saran jalan, daftar gap dibersihkan dulu dari
 * skill yang sudah tercakup lewat implikasi.
 *
 * Engine v3.2: diagnosis melewati EMPAT tahap deterministik sebelum dipakai —
 * buang gap tersirat, verifikasi kutipan bukti, naikkan gap yang buktinya sudah
 * ditemukan kode, lalu timpa teks yang masih berupa cetakan. Saran mendapat
 * guardrail ketujuh: gap yang diklaim harus benar-benar terantar.
 *
 * Engine v3.2a: jangkar saran diluruskan dulu ke teks CV asli sebelum guardrail
 * menilainya, dan seluruh pencocokan kutipan memakai satu implementasi bersama
 * (quoteLocator) supaya tidak ada lagi dua pemeriksa yang berbeda pendapat soal
 * kalimat yang sama.
 */
export async function generateAnalysisReport(args: {
  cv: CvStructured
  job: JobParsed
  rawText: string
  language: string
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
  const implied = [...(rule.impliedMust ?? []), ...(rule.impliedNice ?? [])]
  const hints = rule.presentationHints ?? []

  const system = [
    HONESTY_SYSTEM_PROMPT,
    languageInstruction(language),
    `Kamu menghasilkan SATU laporan utuh { gaps, suggestions, careerNote } — semuanya harus SATU pemikiran dan tidak boleh saling bertentangan: saran hanya boleh lahir dari gap yang bisa dijawab dengan revisi teks.`,
    `ATURAN GAPS:
- severity: "must" jika dari requirement wajib lowongan, "nice" jika nice-to-have/plus point.
- fixability: "fixable_by_editing" HANYA jika faktanya sudah ada di CV dan tinggal disajikan; "requires_experience" jika jujur butuh pengalaman/belajar nyata (JANGAN beri advice template "ikut kursus" berulang — beri langkah spesifik & realistis, atau akui tidak bisa ditambal tulisan); "fit_constraint" untuk faktor non-skill (atribut personal, identitas, lokasi) — tulis netral & sensitif, TANPA menyarankan mengubah diri.
- HANYA gap ber-fixability "fixable_by_editing" yang boleh melahirkan suggestion.`,
    EVIDENCE_FIRST_RULES,
    PRESENTATION_RULES,
    IMPLICATION_RULES,
    `LANGKAH WAJIB SEBELUM MENULIS SETIAP \`after\`:
1. Cari ke SELURUH teks CV apakah ada ANGKA yang berhubungan dengan bullet ini (jumlah orang, durasi, frekuensi, persentase, nominal, jumlah proyek). Angka yang sudah ada tapi tercecer di bagian lain CV BOLEH dipindahkan ke bullet ini.
2. Kalau tidak ada satu pun angka, cari CAKUPAN konkret (berapa banyak, untuk siapa, seberapa sering, dengan tools apa) yang sudah tertulis di CV.
3. Kalau dua-duanya tidak ada, JANGAN mengarang angka. Lebih baik saran ini tidak dibuat.`,
    `ATURAN SUGGESTIONS:
- before = KUTIPAN VERBATIM dari "Teks CV asli" — persis karakter demi karakter (tanda baca & kapitalisasi). Sistem MENOLAK otomatis saran yang \`before\`-nya tidak ditemukan verbatim.
- basedOnFacts = kutipan VERBATIM potongan teks CV (bukan parafrase seperti "team collaboration" — kutip "with the team").
- targetRequirement = kutip requirement lowongan yang dijawab saran ini. Saran tanpa target akan DIBUANG.
- addressesGap = isi dengan \`skill\` dari salah satu gap yang kamu tulis sendiri di atas. Harus sama persis.
- Kata kunci gap yang kamu klaim di addressesGap WAJIB benar-benar muncul di \`after\`. Mengaku menjawab gap "OCR" tapi kata "OCR" tidak ada di hasil akhirnya = saran DIBUANG otomatis.
- whatChanged = klaim perubahan yang bisa DIBUKTIKAN dari teksmu sendiri. Sistem memverifikasi: "added_metric" wajib memunculkan angka baru di \`after\`; "added_tool" wajib memunculkan istilah lowongan yang benar-benar bertambah. Klaim palsu = saran DIBUANG.
- rationale = 1 kalimat: kenapa perubahan ini menaikkan peluang untuk lowongan INI.
- impact = "high" hanya untuk saran yang menjawab requirement WAJIB yang sedang lemah.
- DILARANG kata sifat memuji diri: "highly skilled", "expert in", "strong background", "showcasing expertise", "pekerja keras", "sangat ahli", dsb — divalidasi otomatis dan langsung ditolak. Termasuk kata pengisi seperti "seamless", "cutting-edge", "state-of-the-art".
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
            "Ini bukan kekurangan kemampuan. Requirement di bawah TIDAK cocok secara kata harfiah, tapi kode sudah menemukan fakta terkait di CV. Klasifikasikan sebagai type \"presentation\" dan pakai kutipan di bawah sebagai evidenceQuote.",
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
  gaps = promoteHintedGaps(gaps, hints)
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
      postCheckUsefulness(suggestion, job),
      checkGapLink(suggestion, gaps),
      checkGapDelivered(suggestion, gaps),
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
    gaps,
    suggestions: kept.slice(0, limit),
    rejected,
    careerNote: result.careerNote.trim(),
  }
}
