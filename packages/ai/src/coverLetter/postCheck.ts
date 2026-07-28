import type {
  CoverLetterDraft,
  CoverLetterParagraph,
  CvStructured,
  RejectedCoverLetterParagraph,
} from "@dilirik/shared"
import { collectCvFacts, normalize, type PostCheckResult } from "../guardrail/postCheck"

/** Placeholder yang lolos schema tapi jelek dilihat user ("[Nama Perusahaan]"). */
const PLACEHOLDER_PATTERN = /\[[^\]]{2,40}\]|\{\{[^}]{2,40}\}\}/

/**
 * Guardrail kejujuran untuk SATU paragraf surat.
 *
 * Prinsipnya sama dengan `postCheckSuggestion` pada engine analisis: setiap
 * klaim harus punya jejak di `structuredJson` CV. Bedanya, di sini yang
 * diverifikasi adalah `evidenceFromCv` milik paragraf surat.
 */
export function postCheckCoverLetterParagraph(
  paragraph: CoverLetterParagraph,
  cv: CvStructured,
): PostCheckResult {
  if (!paragraph.text.trim()) {
    return { ok: false, reason: "Paragraf kosong" }
  }
  if (PLACEHOLDER_PATTERN.test(paragraph.text)) {
    return { ok: false, reason: "Paragraf masih mengandung placeholder yang belum terisi" }
  }
  if (paragraph.evidenceFromCv.length === 0) {
    return { ok: false, reason: "Paragraf tidak merujuk fakta CV manapun" }
  }

  const facts = collectCvFacts(cv)
  const haystack = facts.join(" | ")
  for (const claimed of paragraph.evidenceFromCv) {
    const needle = normalize(claimed)
    if (!needle) return { ok: false, reason: "Fakta rujukan kosong" }
    const found =
      haystack.includes(needle) ||
      facts.some((fact) => fact.includes(needle) || needle.includes(fact))
    if (!found) {
      return {
        ok: false,
        reason: `Fakta "${claimed}" tidak ditemukan di CV — kemungkinan halusinasi`,
      }
    }
  }
  return { ok: true }
}

export type CoverLetterFilterResult = {
  draft: CoverLetterDraft
  rejected: RejectedCoverLetterParagraph[]
}

/**
 * Saring seluruh paragraf badan surat. Paragraf yang gagal DIBUANG (bukan
 * ditambal), dan alasannya dikembalikan supaya bisa ditampilkan transparan
 * ke user — konsisten dengan daftar `rejectedSuggestions` di engine analisis.
 */
export function filterCoverLetterDraft(
  draft: CoverLetterDraft,
  cv: CvStructured,
): CoverLetterFilterResult {
  const kept: CoverLetterParagraph[] = []
  const rejected: RejectedCoverLetterParagraph[] = []

  for (const paragraph of draft.bodyParagraphs) {
    const check = postCheckCoverLetterParagraph(paragraph, cv)
    if (check.ok) kept.push(paragraph)
    else rejected.push({ paragraph, reason: check.reason })
  }

  return { draft: { ...draft, bodyParagraphs: kept }, rejected }
}

/** Render draft menjadi teks polos siap salin — sumber kebenaran semua format ekspor. */
export function renderCoverLetterText(draft: CoverLetterDraft): string {
  return [
    draft.greeting,
    draft.opening,
    ...draft.bodyParagraphs.map((paragraph) => paragraph.text),
    draft.closing,
    draft.signOff,
  ]
    .map((block) => block.trim())
    .filter(Boolean)
    .join("\n\n")
}
