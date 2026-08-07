import type { CvStructured, JobParsed } from "@dilirik/shared"
import { normalize } from "../guardrail/postCheck"
import { findConceptEvidence } from "./conceptEvidence"
import { expandSkill, isKnownTerm, isShortToken, stripVersionSuffix } from "./skillAliases"
import {
  displayNameFor,
  expandImplications,
  IMPLICATION_ROOTS,
  type ImplicationConfidence,
  type ImplicationHit,
  type SkillSource,
} from "./skillImplications"

const MUST_WEIGHT = 3
const NICE_WEIGHT = 1

/**
 * Bobot untuk skill yang tercakup lewat implikasi, bukan lewat kata harfiah.
 *
 * `certain` diberi bobot PENUH dengan sengaja. Menolak mengakui seseorang bisa
 * HTML padahal dia membangun 170+ komponen Vue bukan sikap hati-hati — itu
 * kesalahan pengukuran. `likely` diberi bobot parsial karena masih ada celah
 * kemungkinan dia benar-benar tidak menguasainya.
 */
export const IMPLIED_WEIGHT_FACTOR: Record<ImplicationConfidence, number> = {
  certain: 1,
  likely: 0.6,
}

/** Bersihkan tanda baca yang menempel di tepi token ("react," → "react"). */
const TRIM_EDGE = /^[.\-/]+|[.\-/]+$/g

/**
 * Pemisah requirement majemuk. Tanda "+" sengaja TIDAK ikut supaya "c++" utuh.
 */
const SPLIT_PATTERN = /\s*(?:\/|,|&|\bdan\b|\batau\b|\bor\b)\s*/

type CorpusIndex = { tokens: Set<string>; text: string }

function buildIndex(entries: string[]): CorpusIndex {
  const tokens = new Set<string>()
  const parts: string[] = []
  for (const entry of entries) {
    const normalized = normalize(entry)
    if (!normalized) continue
    parts.push(` ${normalized} `)
    for (const raw of normalized.split(" ")) {
      const token = raw.replace(TRIM_EDGE, "")
      if (token) tokens.add(token)
    }
  }
  return { tokens, text: parts.join("|") }
}

function matches(variant: string, index: CorpusIndex): boolean {
  if (variant.includes(" ")) return index.text.includes(` ${variant} `)
  return index.tokens.has(variant.replace(TRIM_EDGE, "")) || index.text.includes(` ${variant} `)
}

function literalCovered(needle: string, wide: CorpusIndex, strict: CorpusIndex): boolean {
  return expandSkill(needle).some((variant) =>
    matches(variant, isShortToken(variant) ? strict : wide),
  )
}

/**
 * Cek apakah sebuah skill lowongan benar-benar tercakup di CV secara HARFIAH.
 *
 * Engine v3 — pencocokan TOKEN/FRASA UTUH + peta alias, bukan substring dua arah:
 * - "Java" TIDAK lagi tercakup oleh "JavaScript".
 * - "R", "Go", "C", "AI" (token ≤ 2 karakter) hanya dicari di daftar skill
 *   eksplisit (`skillOnlyCorpus`), tidak di kalimat bebas seperti "go to market".
 * - Kemiripan yang sah ("JS" ↔ "JavaScript") ditangani `skillAliases.ts`.
 *
 * Catatan: fungsi ini SENGAJA tidak tahu apa-apa soal implikasi skill. Untuk
 * penilaian penuh (harfiah + tersirat) pakai `ruleBasedScore`.
 */
export function skillCovered(
  jobSkill: string,
  cvCorpus: string[],
  skillOnlyCorpus?: string[],
): boolean {
  const needle = normalize(jobSkill)
  if (!needle) return false
  const wide = buildIndex(cvCorpus)
  const strict = skillOnlyCorpus ? buildIndex(skillOnlyCorpus) : wide
  if (literalCovered(needle, wide, strict)) return true
  const stripped = stripVersionSuffix(needle)
  return stripped !== needle && literalCovered(stripped, wide, strict)
}

/**
 * Pecah requirement majemuk ("HTML/CSS", "HTML dan CSS") HANYA bila seluruh
 * pecahannya istilah yang dikenal engine.
 *
 * Syarat itu yang menjaga "ci/cd", "ui/ux", dan "shadcn/ui" tetap utuh — kalau
 * dipecah membabi buta, tiga istilah itu langsung rusak.
 */
function splitRequirement(normalized: string): string[] {
  const whole = stripVersionSuffix(normalized)
  const parts = normalized
    .split(SPLIT_PATTERN)
    .map((part) => stripVersionSuffix(part.trim()))
    .filter(Boolean)
  if (parts.length < 2) return [whole]
  return parts.every(isKnownTerm) ? parts : [whole]
}

function findImplication(
  part: string,
  implications: Map<string, ImplicationHit>,
): ImplicationHit | undefined {
  for (const variant of expandSkill(part)) {
    const hit = implications.get(variant)
    if (hit) return hit
  }
  return undefined
}

export type RequirementCoverage =
  | { covered: true; via: "literal" }
  | { covered: true; via: "implied"; confidence: ImplicationConfidence; evidence: string[] }
  | { covered: false }

/**
 * Tentukan status satu requirement lowongan: harfiah, tersirat, atau benar-benar
 * tidak ada.
 *
 * Untuk requirement majemuk, SEMUA pecahannya harus tercakup. "HTML/CSS" berarti
 * keduanya, bukan salah satu. Kalau ada satu pecahan yang cuma tersirat, seluruh
 * requirement dianggap tersirat dengan keyakinan terlemah di antara pecahannya.
 */
function resolveRequirement(
  rawSkill: string,
  wide: CorpusIndex,
  strict: CorpusIndex,
  implications: Map<string, ImplicationHit>,
): RequirementCoverage {
  const normalized = normalize(rawSkill)
  if (!normalized) return { covered: false }

  let confidence: ImplicationConfidence | null = null
  const evidence: string[] = []

  for (const part of splitRequirement(normalized)) {
    if (literalCovered(part, wide, strict)) continue
    const hit = findImplication(part, implications)
    if (!hit) return { covered: false }
    confidence = hit.confidence === "likely" || confidence === "likely" ? "likely" : "certain"
    for (const source of hit.sources) {
      if (!evidence.includes(source)) evidence.push(source)
    }
  }

  if (!confidence) return { covered: true, via: "literal" }
  return { covered: true, via: "implied", confidence, evidence }
}

/**
 * Kumpulkan skill CV yang bisa jadi titik berangkat implikasi.
 *
 * Dipindai dari SELURUH teks CV (bukan cuma daftar skill) supaya "Nuxt 3" yang
 * hanya muncul di dalam kalimat pengalaman tetap terbaca. Skill yang punya jejak
 * di pengalaman ditandai `strong` — hanya yang `strong` boleh melahirkan
 * kesimpulan berbobot penuh.
 */
export function collectImplicationSources(cv: CvStructured): SkillSource[] {
  const declared = [
    ...cv.skills,
    ...(cv.sections ?? []).flatMap((s) => [s.label, ...s.items]),
  ].filter(Boolean)
  const evidenced = [
    ...cv.experiences.flatMap((e) => [e.title, ...(e.highlights ?? [])]),
    ...cv.achievements,
    cv.headline ?? "",
    cv.about ?? "",
  ].filter(Boolean)

  const declaredIndex = buildIndex(declared)
  const evidencedIndex = buildIndex(evidenced)

  const sources: SkillSource[] = []
  for (const root of IMPLICATION_ROOTS) {
    const variants = expandSkill(root)
    const inEvidence = variants.some(
      (variant) => !isShortToken(variant) && matches(variant, evidencedIndex),
    )
    const inDeclared = variants.some((variant) => matches(variant, declaredIndex))
    if (!inEvidence && !inDeclared) continue
    sources.push({ original: displayNameFor(root), normalized: root, strong: inEvidence })
  }
  return sources
}

/** Requirement yang tercakup lewat penalaran, bukan lewat kata harfiah di CV. */
export type ImpliedRequirement = {
  skill: string
  confidence: ImplicationConfidence
  /** Skill CV yang jadi dasar kesimpulan, mis. ["SvelteKit", "Nuxt"]. */
  evidence: string[]
  severity: "must" | "nice"
}

/**
 * Petunjuk bahwa sebuah requirement kemungkinan SUDAH dikerjakan kandidat, hanya
 * tidak memakai istilah yang dipakai lowongan ("OCR" vs "PaddleOCR").
 *
 * SENGAJA tidak menambah skor: kepastiannya di bawah graf implikasi, dan
 * menaikkan angka di layar user berdasarkan dugaan akan merusak arti angka itu.
 * Nilainya ada di hilir — ini bahan baku gap bertipe "presentation", yang justru
 * satu-satunya jenis gap yang bisa langsung diperbaiki dengan menyunting teks.
 */
export type PresentationHint = {
  skill: string
  severity: "must" | "nice"
  /** Istilah konkret di CV yang memicu dugaan, mis. "paddleocr". */
  term: string
  /** Potongan teks CV apa adanya — dipakai sebagai kutipan bukti. */
  quote: string
}

export type RuleBasedResult = {
  score: number
  matchedMust: string[]
  missingMust: string[]
  matchedNice: string[]
  missingNice: string[]
  impliedMust: ImpliedRequirement[]
  impliedNice: ImpliedRequirement[]
  presentationHints: PresentationHint[]
}

/**
 * Untuk setiap requirement yang dinyatakan hilang, cek sekali lagi dengan peta
 * konsep → implementasi sebelum laporan dikirim ke model.
 *
 * Hanya dijalankan pada daftar yang HILANG, jadi biayanya sebanding dengan
 * jumlah requirement yang tidak cocok — biasanya segelintir.
 */
function buildPresentationHints(
  missingMust: string[],
  missingNice: string[],
  corpusEntries: string[],
): PresentationHint[] {
  const hints: PresentationHint[] = []
  const collect = (skill: string, severity: "must" | "nice") => {
    for (const evidence of findConceptEvidence(skill, corpusEntries)) {
      hints.push({ skill, severity, term: evidence.term, quote: evidence.quote })
    }
  }
  for (const skill of missingMust) collect(skill, "must")
  for (const skill of missingNice) collect(skill, "nice")
  return hints
}

/**
 * Scoring rule-based deterministik (PRD §8.3a).
 * Bobot skill wajib (3x) > opsional (1x) → persen 0–100.
 * Korpus mencakup SELURUH isi structured CV, termasuk about & section dinamis
 * (Bahasa, Sertifikasi, dll) sehingga semuanya ikut jadi bahan analisis.
 *
 * Engine v3.1: hasilnya TIGA kelas, bukan dua. Skill yang tersirat dari skill
 * lain (HTML dari React) tidak lagi masuk `missingMust` — kalau tetap dihitung
 * hilang, skor turun palsu dan mode saran ikut salah pilih.
 *
 * Engine v3.2: requirement yang tetap hilang diperiksa sekali lagi dengan peta
 * konsep → implementasi, hasilnya di `presentationHints` (tidak menambah skor).
 */
export function ruleBasedScore(cv: CvStructured, job: JobParsed): RuleBasedResult {
  // Korpus "ketat": tempat skill dideklarasikan secara eksplisit.
  const skillCorpus = [
    ...cv.skills,
    ...(cv.sections ?? []).flatMap((s) => [s.label, ...s.items]),
  ].filter(Boolean)

  // Korpus "luas": seluruh jejak tekstual CV.
  const corpus = [
    ...skillCorpus,
    ...cv.experiences.flatMap((e) => [e.title, ...(e.highlights ?? [])]),
    ...cv.achievements,
    cv.headline ?? "",
    cv.about ?? "",
  ].filter(Boolean)

  const wide = buildIndex(corpus)
  const strict = buildIndex(skillCorpus)
  const implications = expandImplications(collectImplicationSources(cv))

  const matchedMust: string[] = []
  const missingMust: string[] = []
  const impliedMust: ImpliedRequirement[] = []
  for (const skill of job.mustHaveSkills) {
    const coverage = resolveRequirement(skill, wide, strict, implications)
    if (!coverage.covered) missingMust.push(skill)
    else if (coverage.via === "literal") matchedMust.push(skill)
    else
      impliedMust.push({
        skill,
        confidence: coverage.confidence,
        evidence: coverage.evidence,
        severity: "must",
      })
  }

  const matchedNice: string[] = []
  const missingNice: string[] = []
  const impliedNice: ImpliedRequirement[] = []
  for (const skill of job.niceToHaveSkills) {
    const coverage = resolveRequirement(skill, wide, strict, implications)
    if (!coverage.covered) missingNice.push(skill)
    else if (coverage.via === "literal") matchedNice.push(skill)
    else
      impliedNice.push({
        skill,
        confidence: coverage.confidence,
        evidence: coverage.evidence,
        severity: "nice",
      })
  }

  const presentationHints = buildPresentationHints(missingMust, missingNice, corpus)

  const totalWeight =
    job.mustHaveSkills.length * MUST_WEIGHT + job.niceToHaveSkills.length * NICE_WEIGHT
  if (totalWeight === 0) {
    // Tidak ada skill terdeteksi di lowongan → netral 50 agar tidak menyesatkan
    return {
      score: 50,
      matchedMust,
      missingMust,
      matchedNice,
      missingNice,
      impliedMust,
      impliedNice,
      presentationHints,
    }
  }

  const impliedCredit = (items: ImpliedRequirement[]): number =>
    items.reduce((sum, item) => sum + IMPLIED_WEIGHT_FACTOR[item.confidence], 0)

  const gained =
    (matchedMust.length + impliedCredit(impliedMust)) * MUST_WEIGHT +
    (matchedNice.length + impliedCredit(impliedNice)) * NICE_WEIGHT
  const score = Math.round((gained / totalWeight) * 100)

  return {
    score: Math.max(0, Math.min(100, score)),
    matchedMust,
    missingMust,
    matchedNice,
    missingNice,
    impliedMust,
    impliedNice,
    presentationHints,
  }
}
