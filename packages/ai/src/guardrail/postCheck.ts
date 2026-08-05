import type { CvStructured, Gap, JobParsed, Suggestion } from "@dilirik/shared"

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
 * Toleransi hanya sampai perbedaan whitespace (PDF sering menyisipkan newline
 * di tengah kalimat). Lebih longgar dari itu = auto-replace pasti meleset.
 */
export function postCheckAnchor(suggestion: Suggestion, rawText: string): PostCheckResult {
  const before = suggestion.before ?? ""
  if (!before.trim()) {
    return { ok: false, reason: "Kutipan `before` kosong — saran tidak punya jangkar di CV" }
  }
  if (rawText.includes(before)) return { ok: true }
  if (squashWhitespace(rawText).includes(squashWhitespace(before))) return { ok: true }
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

/** Guardrail titik-3b: tolak kata sifat memuji diri yang tidak bisa diverifikasi. */
export function postCheckBannedPhrases(suggestion: Suggestion): PostCheckResult {
  for (const { pattern, label } of BANNED_PHRASE_PATTERNS) {
    if (pattern.test(suggestion.after)) {
      return {
        ok: false,
        reason: `Mengandung frasa klise yang dilarang: "${label}" — recruiter mengabaikannya dan ATS tidak menilainya`,
      }
    }
  }
  return { ok: true }
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
 * Guardrail KEBERGUNAAN (engine v3).
 *
 * Perubahan penting dari v2: aturan "anti-kosmetik" lama mewajibkan setiap kata
 * baru menyentuh istilah lowongan. Aturan itu justru MENDORONG keyword stuffing
 * — bertabrakan dengan aturan #4 di HONESTY_SYSTEM_PROMPT. Sekarang yang dicek
 * adalah KLAIM saran itu sendiri (`whatChanged`), yang bisa diverifikasi kode:
 * mengaku menambah angka → harus ada angka baru, mengaku menambah tools → harus
 * ada istilah lowongan yang benar-benar bertambah.
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

  if (changes.includes("added_metric") && digitsAfter <= digitsBefore) {
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
