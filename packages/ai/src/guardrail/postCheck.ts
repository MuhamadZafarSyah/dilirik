import type { CvStructured, Gap, JobParsed, Suggestion } from "@dilirik/shared"
import { locateQuote } from "./quoteLocator"

/** Normalisasi string untuk pencocokan fakta yang toleran. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s+#./-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** Rapatkan whitespace tanpa mengubah karakter lain (untuk pencocokan verbatim). */
export function squashWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim()
}

/**
 * Token yang terlalu umum untuk dijadikan bukti apa pun.
 *
 * Dipakai dua guardrail yang sekilas tak berhubungan: pencarian bukti konsep di
 * `conceptEvidence` (supaya requirement "data visualization" tidak cocok dengan
 * setiap kalimat yang memuat kata "data") dan verifikasi klaim `added_scope` di
 * bawah (supaya menambah kata "dan sistem tim" tidak dihitung sebagai
 * memperluas cakupan). Keduanya menanyakan hal yang sama — "apakah kata ini
 * membawa informasi?" — jadi daftarnya harus satu, bukan dua salinan yang
 * pelan-pelan berbeda.
 *
 * Tinggal di sini, bukan di `conceptEvidence`, karena `conceptEvidence` sudah
 * mengimpor `normalize` dari berkas ini. Arah sebaliknya akan membuat impor
 * melingkar.
 */
const GENERIC_TOKENS = new Set([
  "data",
  "system",
  "systems",
  "sistem",
  "design",
  "desain",
  "web",
  "api",
  "apis",
  "tool",
  "tools",
  "user",
  "users",
  "code",
  "app",
  "apps",
  "team",
  "tim",
  "cloud",
  "service",
  "services",
  "software",
  "development",
  "developer",
  "management",
  "modern",
  "basic",
  "dasar",
  "pengalaman",
  "kemampuan",
  "menguasai",
  "terbiasa",
  "mampu",
  "pernah",
  "and",
  "the",
  "for",
  "with",
  "dan",
  "atau",
  "serta",
  "yang",
])

/** Bersihkan tanda baca tepi lalu buang token yang terlalu umum. */
export function distinctiveTokens(normalized: string): string[] {
  return normalized
    .split(" ")
    .map((token) => token.replace(/^[.\-/]+|[.\-/]+$/g, ""))
    .filter((token) => token.length >= 3 && !GENERIC_TOKENS.has(token))
}

/** Kumpulkan seluruh fakta tekstual dari structuredJson CV (termasuk about & section dinamis). */
export function collectCvFacts(cv: CvStructured): string[] {
  const facts: string[] = [...cv.skills, ...cv.achievements]
  if (cv.fullName) facts.push(cv.fullName)
  if (cv.headline) facts.push(cv.headline)
  if (cv.about) facts.push(cv.about)
  for (const exp of cv.experiences) {
    facts.push(exp.title)
    if (exp.company) facts.push(exp.company)
    facts.push(...exp.highlights)
  }
  for (const edu of cv.education) {
    facts.push(edu.institution)
    if (edu.degree) facts.push(edu.degree)
  }
  for (const section of cv.sections ?? []) {
    facts.push(section.label)
    facts.push(...section.items)
  }
  return facts.map(normalize).filter(Boolean)
}

/** Kumpulkan seluruh istilah lowongan (untuk guardrail relevansi). */
export function collectJobTerms(job: JobParsed): string[] {
  return [
    job.jobTitle ?? "",
    job.company ?? "",
    job.level ?? "",
    ...job.mustHaveSkills,
    ...job.niceToHaveSkills,
    ...job.requirements,
    ...job.keywords,
  ]
    .map(normalize)
    .filter(Boolean)
}

export type PostCheckResult =
  | { ok: true }
  | { ok: false; reason: string }

/**
 * Guardrail titik-3a / JANGKAR (engine v3).
 *
 * `before` dijanjikan sebagai kutipan VERBATIM teks CV, tapi engine v2 tidak
 * pernah memverifikasinya. Akibatnya saran yang jangkarnya diparafrase tidak
 * bisa ditempelkan otomatis di langkah revisi — user melihat saran yang "gagal
 * diterapkan" tanpa penjelasan.
 *
 * Engine v3.2a: aturan pencocokannya dipindah seluruhnya ke `quoteLocator`.
 * Sebelumnya fungsi ini punya dua lapis pencocokan sendiri, dan aturannya
 * berbeda dari yang dipakai enforceGapEvidence — satu kalimat CV yang sama bisa
 * lolos di satu pemeriksaan dan gagal di pemeriksaan lain.
 *
 * Catatan: pemanggil sebaiknya menjalankan alignSuggestionAnchors lebih dulu,
 * supaya jangkar yang cuma beda tanda baca diperbaiki, bukan ditolak. Yang
 * sampai ke sini seharusnya tinggal jangkar yang memang bukan teks CV.
 */
export function postCheckAnchor(suggestion: Suggestion, rawText: string): PostCheckResult {
  const before = suggestion.before ?? ""
  if (!before.trim()) {
    return { ok: false, reason: "Kutipan `before` kosong — saran tidak punya jangkar di CV" }
  }
  if (locateQuote(before, rawText)) return { ok: true }
  return {
    ok: false,
    reason: `Kutipan "${before.slice(0, 60)}" tidak ada verbatim di teks CV — saran tidak bisa diterapkan otomatis`,
  }
}

/**
 * Guardrail titik-3 / KEJUJURAN (PRD §8): setiap saran WAJIB merujuk fakta
 * yang benar-benar ada di structuredJson CV.
 */
export function postCheckSuggestion(
  suggestion: Suggestion,
  cv: CvStructured,
): PostCheckResult {
  const facts = collectCvFacts(cv)
  const haystack = facts.join(" | ")
  if (suggestion.basedOnFacts.length === 0) {
    return { ok: false, reason: "Saran tidak merujuk fakta CV manapun" }
  }
  for (const claimed of suggestion.basedOnFacts) {
    const needle = normalize(claimed)
    if (!needle) return { ok: false, reason: "Fakta rujukan kosong" }
    const found =
      haystack.includes(needle) ||
      facts.some((f) => f.includes(needle) || needle.includes(f))
    if (!found) {
      return {
        ok: false,
        reason: `Fakta "${claimed}" tidak ditemukan di CV — kemungkinan halusinasi`,
      }
    }
  }
  return { ok: true }
}

/**
 * Frasa terlarang — dilarang di prompt SEKALIGUS divalidasi di kode.
 * Larangan yang cuma hidup di prompt akan bocor cepat atau lambat.
 *
 * Engine v3.2: pola bahasa Inggris diperbanyak. Sebelumnya 13 pola mayoritas
 * berbahasa Indonesia, sementara CV yang dianalisis sering berbahasa Inggris —
 * jadi guardrail ini praktis buta pada kasus paling umum. "seamless" masuk
 * daftar karena itu kata pengisi yang paling sering dipakai model untuk membuat
 * kalimat terasa lebih panjang tanpa menambah satu pun informasi baru.
 */
export const BANNED_PHRASE_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bhighly\s+skilled\b/i, label: "highly skilled" },
  { pattern: /\bexpert\s+(in|at|with)\b/i, label: "expert in" },
  { pattern: /\bstrong\s+background\b/i, label: "strong background" },
  { pattern: /\bshowcas(e|ing)\s+(expertise|skills)\b/i, label: "showcasing expertise" },
  { pattern: /\bproven\s+track\s+record\b/i, label: "proven track record" },
  { pattern: /\bresults[-\s]driven\b/i, label: "results-driven" },
  { pattern: /\bteam\s+player\b/i, label: "team player" },
  { pattern: /\bpassionate\s+about\b/i, label: "passionate about" },
  { pattern: /\bseamless(ly)?\b/i, label: "seamless" },
  { pattern: /\bcutting[-\s]edge\b/i, label: "cutting-edge" },
  { pattern: /\bstate[-\s]of[-\s]the[-\s]art\b/i, label: "state-of-the-art" },
  { pattern: /\bdetail[-\s]oriented\b/i, label: "detail-oriented" },
  { pattern: /\bself[-\s]motivated\b/i, label: "self-motivated" },
  { pattern: /\bfast\s+learner\b/i, label: "fast learner" },
  { pattern: /\bexcellent\s+(communication|interpersonal)\b/i, label: "excellent communication" },
  { pattern: /\bsangat\s+(ahli|mahir|berpengalaman|kompeten)\b/i, label: "sangat ahli" },
  { pattern: /\bberpengalaman\s+luas\b/i, label: "berpengalaman luas" },
  { pattern: /\bpekerja\s+keras\b/i, label: "pekerja keras" },
  { pattern: /\bdedikasi\s+tinggi\b/i, label: "dedikasi tinggi" },
  { pattern: /\bmampu\s+bekerja\s+(dalam\s+tim|di\s+bawah\s+tekanan)\b/i, label: "mampu bekerja dalam tim" },
]

/**
 * Cari frasa klise pertama di sebuah teks; `null` kalau bersih.
 *
 * Sengaja dipisah dari `postCheckBannedPhrases` supaya daftar polanya bisa
 * dipakai pada teks yang BUKAN saran — `careerNote` misalnya, yang sebelumnya
 * lolos sepenuhnya dari pemeriksaan ini dan jadi satu-satunya tempat frasa
 * seperti "strong background" masih bisa sampai ke pengguna.
 */
export function findBannedPhrase(text: string): string | null {
  for (const { pattern, label } of BANNED_PHRASE_PATTERNS) {
    if (pattern.test(text)) return label
  }
  return null
}

/** Guardrail titik-3b: tolak kata sifat memuji diri yang tidak bisa diverifikasi. */
export function postCheckBannedPhrases(suggestion: Suggestion): PostCheckResult {
  const label = findBannedPhrase(suggestion.after)
  if (!label) return { ok: true }
  return {
    ok: false,
    reason: `Mengandung frasa klise yang dilarang: "${label}" — recruiter mengabaikannya dan ATS tidak menilainya`,
  }
}

/**
 * Buang KALIMAT yang memuat frasa klise, bukan seluruh teksnya (engine v3.3.1).
 *
 * Dipakai untuk `careerNote`. Saran punya jalur penolakan — kalau ditolak,
 * saran lain menggantikannya. `careerNote` tidak: cuma ada satu, dan membuang
 * seluruhnya karena satu kalimat berarti membuang paragraf yang bagian lainnya
 * masih berguna. Membuang per kalimat menahan kerusakan sekecil mungkin.
 */
export function stripBannedSentences(text: string): string {
  if (!text.trim()) return text
  const sentences = text.split(/(?<=[.!?])\s+/)
  const kept = sentences.filter((sentence) => !findBannedPhrase(sentence))
  if (kept.length === sentences.length) return text
  return squashWhitespace(kept.join(" "))
}

/** Semua isi kurung, termasuk kurungnya. */
function parentheticals(text: string): string[] {
  return text.match(/\([^()]*\)/g) ?? []
}

/** Buang semua kurung agar sisa kalimatnya bisa dibandingkan. */
function stripParentheticals(text: string): string {
  return text.replace(/\s*\([^()]*\)/g, " ")
}

/**
 * Guardrail titik-9 / KEALAMIAN KALIMAT (engine v3.3).
 *
 * Guardrail pengantaran v3.2.3 mewajibkan kata kunci gap benar-benar muncul di
 * `after`. Model menemukan jalan termurah untuk mematuhinya: menempelkan
 * istilahnya dalam kurung. "...document capture via PaddleOCR" jadi
 * "...document capture via PaddleOCR (OCR)". Secara teknis lolos — kata "OCR"
 * memang muncul — tapi hasilnya kalimat CV yang canggung dan berbau keyword
 * stuffing, persis yang dilarang aturan #4 HONESTY_SYSTEM_PROMPT.
 *
 * Yang ditolak hanya kasus paling telanjang: SELURUH perubahan cuma berupa
 * sisipan dalam kurung. Kalau kalimatnya juga ditulis ulang, kurungnya bukan
 * masalah.
 *
 * Pengecualian angka disengaja. Kurung yang memuat angka ("(3 posting/minggu)",
 * "(21 halaman)") membawa informasi yang benar-benar baru bagi pembaca, dan itu
 * justru gaya penulisan CV yang baik — beda sifatnya dengan menempelkan ulang
 * istilah yang sudah ada di kalimat itu juga.
 */
export function postCheckNaturalPhrasing(suggestion: Suggestion): PostCheckResult {
  const existing = parentheticals(suggestion.before)
  const added = parentheticals(suggestion.after).filter(
    (group) => !existing.includes(group),
  )
  if (added.length === 0) return { ok: true }
  if (added.some((group) => /\d/.test(group))) return { ok: true }

  const rewritten =
    normalize(stripParentheticals(suggestion.after)) !==
    normalize(stripParentheticals(suggestion.before))
  if (rewritten) return { ok: true }

  return {
    ok: false,
    reason: `Satu-satunya perubahan adalah menempelkan ${added.join(" ")} dalam kurung — istilahnya memang muncul, tapi kalimatnya tidak jadi lebih baik dan terbaca sebagai keyword stuffing. Tulis ulang kalimatnya supaya istilah itu mengalir natural.`,
  }
}

/**
 * Template ISI-BLANKO pada teks GAP (engine v3.2).
 *
 * Uji gold set #02 menghasilkan lima gap dengan kalimat yang identik polanya:
 * "Tidak ada pengalaman atau pengetahuan tentang X di CV" / "Perlu menambahkan
 * pengalaman atau pengetahuan tentang X". Kalimat semacam itu bisa ditulis TANPA
 * MEMBACA CV sama sekali — cukup menyalin nama skill ke dalam cetakan. Itulah
 * tanda paling jelas bahwa model tidak benar-benar menyisir CV, dan justru
 * kalimat inilah yang melahirkan vonis palsu "tidak ada pengalaman OCR" pada CV
 * yang memakai PaddleOCR.
 *
 * Dipisah dari BANNED_PHRASE_PATTERNS karena sasarannya beda: yang itu memeriksa
 * `after` sebuah saran, yang ini memeriksa explanation & advice sebuah gap.
 */
export const BANNED_GAP_PHRASE_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  {
    pattern: /tidak\s+ada\s+(bukti\s+)?(pengalaman|pengetahuan)/i,
    label: "tidak ada pengalaman atau pengetahuan tentang ...",
  },
  {
    pattern: /perlu\s+menambahkan\s+(pengalaman|pengetahuan)/i,
    label: "perlu menambahkan pengalaman atau pengetahuan tentang ...",
  },
  {
    pattern: /tidak\s+ditemukan\s+(bukti\s+)?(pengalaman|pengetahuan)/i,
    label: "tidak ditemukan bukti pengalaman ...",
  },
  {
    pattern: /\bno\s+(evidence|experience|mention)\s+(of|with|in|about)\b/i,
    label: "no evidence of ...",
  },
  {
    pattern: /\b(is\s+)?not\s+(mentioned|present|listed)\s+in\s+the\s+cv\b/i,
    label: "not mentioned in the CV",
  },
]

/**
 * Guardrail titik-6b: deteksi teks gap yang cuma hasil mengisi cetakan.
 *
 * Sengaja TIDAK membuang gap-nya — skill yang memang tidak ada tetap harus
 * dilaporkan. Yang salah bukan keberadaan gap-nya, melainkan kalimatnya. Karena
 * itu hasil pemeriksaan ini dipakai `repairTemplateGaps` untuk MENIMPA teksnya
 * dengan kalimat yang menyebut istilah apa saja yang benar-benar dicari.
 */
export function postCheckGapPhrases(gap: Gap): PostCheckResult {
  const haystack = `${gap.explanation ?? ""} ${gap.advice ?? ""}`
  for (const { pattern, label } of BANNED_GAP_PHRASE_PATTERNS) {
    if (pattern.test(haystack)) {
      return {
        ok: false,
        reason: `Teks gap memakai template isi-blanko: "${label}" — kalimat ini bisa ditulis tanpa membaca CV`,
      }
    }
  }
  return { ok: true }
}

/**
 * Minimum token bermakna yang harus bertambah sebelum klaim `added_scope`
 * dianggap terbukti. Satu kata bisa saja cuma sinonim atau kata sambung;
 * dua kata bermakna baru sudah sulit terjadi tanpa informasi yang benar-benar
 * bertambah.
 */
const MIN_SCOPE_TOKENS = 2

/**
 * Guardrail KEBERGUNAAN (engine v3).
 *
 * Perubahan penting dari v2: aturan "anti-kosmetik" lama mewajibkan setiap kata
 * baru menyentuh istilah lowongan. Aturan itu justru MENDORONG keyword stuffing
 * — bertabrakan dengan aturan #4 di HONESTY_SYSTEM_PROMPT. Sekarang yang dicek
 * adalah KLAIM saran itu sendiri (`whatChanged`), yang bisa diverifikasi kode:
 * mengaku menambah angka → harus ada angka baru, mengaku menambah tools → harus
 * ada istilah lowongan yang benar-benar bertambah.
 *
 * Engine v3.3.1: `added_scope` ikut diverifikasi. Sebelumnya ia satu-satunya
 * klaim yang lolos tanpa diperiksa, dan karena itu jadi pilihan teraman bagi
 * model — klaim apa pun yang tidak yakin bisa lolos cukup dengan melabelinya
 * `added_scope`. Guardrail yang punya satu pintu belakang bukan guardrail.
 */
export function postCheckUsefulness(
  suggestion: Suggestion,
  job: JobParsed,
): PostCheckResult {
  const before = normalize(suggestion.before)
  const after = normalize(suggestion.after)
  if (!after || after === before) {
    return { ok: false, reason: "No-op — hasil tulis ulang sama saja dengan teks asli" }
  }

  const jobText = collectJobTerms(job).join(" | ")

  const target = normalize(suggestion.targetRequirement ?? "")
  if (!target) {
    return {
      ok: false,
      reason: "Saran tidak menyebut requirement lowongan yang dijawab (targetRequirement kosong)",
    }
  }
  const targetTokens = target.split(" ").filter((tok) => tok.length >= 3)
  const targetLinked =
    targetTokens.length === 0 || targetTokens.some((tok) => jobText.includes(tok))
  if (!targetLinked) {
    return {
      ok: false,
      reason: `targetRequirement "${suggestion.targetRequirement}" tidak ditemukan di lowongan`,
    }
  }

  const changes = suggestion.whatChanged ?? []
  if (changes.length === 0) {
    return {
      ok: false,
      reason: "Saran tidak menyatakan apa yang berubah (whatChanged kosong) — tidak bisa diverifikasi",
    }
  }

  const beforeTokens = new Set(before.split(" "))
  const afterTokens = new Set(after.split(" "))
  const addedTokens = [...afterTokens].filter((tok) => tok.length >= 3 && !beforeTokens.has(tok))
  const digitsBefore = (suggestion.before.match(/\d/g) ?? []).length
  const digitsAfter = (suggestion.after.match(/\d/g) ?? []).length
  const hasNewNumber = digitsAfter > digitsBefore

  if (changes.includes("added_metric") && !hasNewNumber) {
    return {
      ok: false,
      reason: "Mengaku menambah angka/metrik, tapi tidak ada angka baru di `after`",
    }
  }
  if (changes.includes("added_tool") && !addedTokens.some((tok) => jobText.includes(tok))) {
    return {
      ok: false,
      reason: "Mengaku menambah tools yang diminta lowongan, tapi tidak ada istilah lowongan yang bertambah",
    }
  }
  if (changes.includes("added_scope")) {
    const meaningful = addedTokens.filter((tok) => !GENERIC_TOKENS.has(tok))
    if (!hasNewNumber && meaningful.length < MIN_SCOPE_TOKENS) {
      return {
        ok: false,
        reason: "Mengaku memperluas cakupan, tapi `after` tidak menambah informasi baru — hanya kata sambung atau istilah umum",
      }
    }
  }
  if (changes.length === 1 && changes[0] === "reordered_for_relevance") {
    const removed = [...beforeTokens].filter((tok) => tok.length >= 3 && !afterTokens.has(tok))
    if (removed.length > 3) {
      return {
        ok: false,
        reason: "Mengaku hanya menyusun ulang, tapi banyak informasi asli justru hilang",
      }
    }
  }
  return { ok: true }
}

/**
 * Buang saran kembar: dua saran yang jangkarnya (`before`) sama atau saling
 * memuat akan bertabrakan saat diterapkan — yang kedua pasti gagal replace.
 * Saran pertama (impact tertinggi, karena sudah diurutkan) yang dipertahankan.
 */
export function dedupeSuggestions(suggestions: Suggestion[]): {
  kept: Suggestion[]
  dropped: Array<{ suggestion: Suggestion; reason: string }>
} {
  const kept: Suggestion[] = []
  const dropped: Array<{ suggestion: Suggestion; reason: string }> = []
  const anchors: string[] = []
  for (const suggestion of suggestions) {
    const anchor = normalize(suggestion.before)
    const clash = anchors.find(
      (existing) =>
        existing === anchor ||
        (anchor.length >= 15 && existing.includes(anchor)) ||
        (existing.length >= 15 && anchor.includes(existing)),
    )
    if (clash) {
      dropped.push({
        suggestion,
        reason: "Jangkar `before` bertabrakan dengan saran lain yang lebih berdampak",
      })
      continue
    }
    anchors.push(anchor)
    kept.push(suggestion)
  }
  return { kept, dropped }
}
