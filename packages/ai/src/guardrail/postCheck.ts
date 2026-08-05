import type { CvStructured, JobParsed, Suggestion } from "@dilirik/shared"

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
