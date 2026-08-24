import { z } from "zod"
import { generateStructured } from "../generateStructured.js"
import { normalize } from "../guardrail/postCheck.js"
import { buildCurationPrompt, CURATION_SYSTEM } from "./prompts.js"

/**
 * Kurasi "Wajib Coba" (PRD Cari Lowongan §11.1 & §11.5).
 *
 * SATU call LLM untuk seluruh pencarian: 20 kandidat masuk sebagai satu batch,
 * 5 pilihan keluar. Bukan satu call per lowongan — pola itu membuat biaya naik
 * sebanding jumlah hasil dan itulah yang membuat fitur pencarian mahal.
 *
 * Yang keluar dari model TIDAK langsung dipercaya. Setiap alasan lewat guardrail
 * lokal; kalau yang lolos kurang dari 3, pemanggil diberi tahu agar jatuh kembali
 * ke urutan rule-based TANPA narasi — lebih baik tanpa penjelasan daripada dengan
 * penjelasan yang mengarang.
 */

export const TOP_PICK_TARGET = 5
export const MIN_VALID_PICKS = 3

export const curationSchema = z.object({
  topPicks: z
    .array(
      z.object({
        candidateIndex: z.number().int().min(1),
        reasonText: z.string().min(20).max(280),
        cautionText: z.string().max(200).nullable(),
      }),
    )
    .min(1)
    .max(8),
  note: z.string().max(240).nullable(),
})

export type CurationResult = z.infer<typeof curationSchema>

export type CurationCandidate = {
  index: number
  title: string
  company: string
  location?: string | null
  remoteType?: string | null
  postedDaysAgo?: number | null
  salaryText?: string | null
  skillTerms?: string[]
  snippet?: string | null
  sourceDisplayName?: string | null
}

/** Klaim yang tidak boleh keluar dari fitur pencarian, apa pun konteksnya. */
const BANNED_CURATION_PATTERNS: RegExp[] = [
  /dijamin|pasti (diterima|lolos|dipanggil)|guarantee/i,
  /peluang(mu)? \d+\s*%|\d+\s*% (peluang|chance)/i,
  /kamu akan (diterima|dipanggil|lolos)/i,
  /sangat cocok sekali|paling cocok di dunia|sempurna untuk kamu/i,
  /gaji (besar|tinggi|fantastis)/i,
  /lowongan (terbaik|impian) (kamu|anda)/i,
]

const GENERIC_PHRASES = [
  "cocok dengan profil kamu",
  "sesuai dengan pengalaman kamu",
  "kesempatan bagus",
  "peluang menarik",
  "sangat relevan",
  "good fit for you",
]

export function buildCandidatesText(candidates: CurationCandidate[]): string {
  return candidates
    .map((candidate) => {
      const facts = [
        `[${candidate.index}] ${candidate.title} — ${candidate.company}`,
        `    Lokasi: ${candidate.location ?? "tidak disebutkan"}${
          candidate.remoteType ? ` (${candidate.remoteType})` : ""
        }`,
        `    Diposting: ${
          typeof candidate.postedDaysAgo === "number"
            ? `${candidate.postedDaysAgo} hari lalu`
            : "tanggal tidak diketahui"
        }`,
      ]
      if (candidate.salaryText) facts.push(`    Gaji: ${candidate.salaryText}`)
      if (candidate.skillTerms && candidate.skillTerms.length > 0) {
        facts.push(`    Skill disebut: ${candidate.skillTerms.slice(0, 12).join(", ")}`)
      }
      if (candidate.snippet) {
        facts.push(`    Ringkasan: ${candidate.snippet.slice(0, 320)}`)
      }
      return facts.join("\n")
    })
    .join("\n\n")
}

/**
 * Guardrail lokal untuk satu alasan. Menolak alasan yang menjanjikan hasil,
 * alasan kosong-makna, atau alasan yang tidak menyebut satu pun kata dari
 * lowongan/profil (indikasi kalimat template).
 */
export function checkReason(
  reasonText: string,
  context: { candidateTerms: string[]; profileTerms: string[] },
): { ok: boolean; failure?: string } {
  const text = reasonText.trim()
  if (text.length < 20) return { ok: false, failure: "terlalu pendek" }

  for (const pattern of BANNED_CURATION_PATTERNS) {
    if (pattern.test(text)) return { ok: false, failure: "klaim berlebihan" }
  }

  const normalized = normalize(text)
  for (const phrase of GENERIC_PHRASES) {
    if (normalized === normalize(phrase)) return { ok: false, failure: "kalimat generik" }
  }

  const anchors = [...context.candidateTerms, ...context.profileTerms]
    .map((term) => normalize(term))
    .filter((term) => term.length >= 3)
  const hasAnchor = anchors.some((term) => normalized.includes(term))
  if (anchors.length > 0 && !hasAnchor) {
    return { ok: false, failure: "tidak menyebut bukti konkret" }
  }

  return { ok: true }
}

export type CuratedPick = {
  candidateIndex: number
  reasonText: string
  cautionText: string | null
}

export type CurateTopPicksResult = {
  picks: CuratedPick[]
  note: string | null
  /** true = jatuh kembali ke urutan rule-based tanpa narasi. */
  usedFallback: boolean
  rejectedCount: number
}

export async function curateTopPicks(params: {
  profileSummary: string
  profileTerms: string[]
  candidates: CurationCandidate[]
  language?: string
}): Promise<CurateTopPicksResult> {
  const { candidates } = params
  if (candidates.length === 0) {
    return { picks: [], note: null, usedFallback: true, rejectedCount: 0 }
  }

  const byIndex = new Map(candidates.map((candidate) => [candidate.index, candidate]))

  const result = await generateStructured({
    schema: curationSchema,
    system: CURATION_SYSTEM,
    prompt: buildCurationPrompt({
      profileSummary: params.profileSummary,
      candidatesText: buildCandidatesText(candidates),
      language: params.language,
    }),
    temperature: 0.2,
  })

  const seen = new Set<number>()
  const picks: CuratedPick[] = []
  let rejectedCount = 0

  for (const pick of result.topPicks) {
    const candidate = byIndex.get(pick.candidateIndex)
    // Indeks halusinasi dan indeks ganda dibuang tanpa negosiasi.
    if (!candidate || seen.has(pick.candidateIndex)) {
      rejectedCount++
      continue
    }

    const verdict = checkReason(pick.reasonText, {
      candidateTerms: [
        candidate.title,
        candidate.company,
        candidate.location ?? "",
        ...(candidate.skillTerms ?? []),
      ].filter(Boolean),
      profileTerms: params.profileTerms,
    })

    if (!verdict.ok) {
      rejectedCount++
      continue
    }

    seen.add(pick.candidateIndex)
    picks.push({
      candidateIndex: pick.candidateIndex,
      reasonText: pick.reasonText.trim(),
      cautionText: pick.cautionText?.trim() ? pick.cautionText.trim() : null,
    })
    if (picks.length >= TOP_PICK_TARGET) break
  }

  if (picks.length < Math.min(MIN_VALID_PICKS, candidates.length)) {
    return { picks: [], note: null, usedFallback: true, rejectedCount }
  }

  return {
    picks,
    note: result.note?.trim() ? result.note.trim() : null,
    usedFallback: false,
    rejectedCount,
  }
}
