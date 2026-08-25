import { z } from "zod"
import { generateStructured } from "../generateStructured.js"
import { buildSearchProfilePrompt, SEARCH_PROFILE_SYSTEM } from "./prompts.js"

/**
 * Profil pencarian dari CV (PRD Cari Lowongan §11.2).
 *
 * Ini SATU-SATUNYA tempat LLM menyentuh CV pada fitur ini, dan hasilnya di-cache
 * per versi CV. Pencarian berikutnya dengan CV yang sama tidak memanggil LLM lagi
 * untuk langkah ini — itu yang menjaga biaya per pencarian tetap satu call.
 */

export const searchProfileSchema = z.object({
  roles: z.array(z.string().min(2).max(120)).min(1).max(5),
  skills: z.array(z.string().min(1).max(80)).max(10),
  locations: z.array(z.string().min(2).max(80)).max(5),
  industries: z.array(z.string().min(2).max(80)).max(5),
  seniority: z.enum(["entry", "mid", "senior", "lead"]),
  remotePref: z.enum(["any", "remote", "hybrid", "onsite"]),
  yearsExp: z.number().int().min(0).max(60).nullable(),
})

export type SearchProfileDraft = z.infer<typeof searchProfileSchema>

export type GenerateSearchProfileParams = {
  /** CV terstruktur (CvStructured) apa adanya. */
  cv: unknown
  language?: string
}

/** Judul posisi yang terlalu umum untuk dipakai sebagai kata kunci pencarian. */
const TOO_GENERIC = new Set([
  "staff",
  "karyawan",
  "pegawai",
  "employee",
  "professional",
  "profesional",
  "pekerja",
  "specialist",
  "generalist",
])

function cleanList(values: string[], limit: number): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values) {
    const trimmed = value.replace(/\s+/g, " ").trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key) || TOO_GENERIC.has(key)) continue
    seen.add(key)
    result.push(trimmed)
    if (result.length >= limit) break
  }
  return result
}

export async function generateSearchProfile(
  params: GenerateSearchProfileParams,
): Promise<SearchProfileDraft> {
  const draft = await generateStructured({
    schema: searchProfileSchema,
    system: SEARCH_PROFILE_SYSTEM,
    prompt: buildSearchProfilePrompt({
      cvJson: JSON.stringify(params.cv),
      language: params.language,
    }),
    temperature: 0.1,
  })

  // Pembersihan deterministik setelah LLM. Model kadang mengembalikan judul
  // sampah seperti "Staff" yang, kalau dipakai sebagai kata kunci, mencocokkan
  // nyaris semua lowongan — lebih buruk daripada tidak mencari sama sekali.
  return {
    ...draft,
    roles: cleanList(draft.roles, 5),
    skills: cleanList(draft.skills, 10).map((skill) => skill.toLowerCase()),
    locations: cleanList(draft.locations, 5),
    industries: cleanList(draft.industries, 5),
  }
}

/** Ringkasan profil untuk prompt kurasi — dijaga pendek agar biaya token stabil. */
export function summarizeProfile(profile: {
  roles: string[]
  skills: string[]
  locations: string[]
  seniority?: string | null
  remotePref?: string | null
  yearsExp?: number | null
}): string {
  const lines = [
    `Posisi dicari: ${profile.roles.join(", ") || "-"}`,
    `Skill: ${profile.skills.join(", ") || "-"}`,
    `Lokasi: ${profile.locations.join(", ") || "tidak disebutkan"}`,
    `Level: ${profile.seniority ?? "tidak diketahui"}`,
    `Preferensi kerja: ${profile.remotePref ?? "any"}`,
  ]
  if (typeof profile.yearsExp === "number") {
    lines.push(`Pengalaman: ${profile.yearsExp} tahun`)
  }
  return lines.join("\n")
}
