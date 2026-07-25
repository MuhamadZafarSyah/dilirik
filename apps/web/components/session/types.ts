import type { CvStructured, Gap, JobParsed, SessionStep, Suggestion } from "@dilirik/shared"

export type SessionDetail = {
  id: string
  step: SessionStep
  status: "DRAFT" | "COMPLETED"
  cvId: string | null
  jobPostingId: string | null
  analysisId: string | null
  revisedCvId: string | null
  applicationId: string | null
  cv: { id: string; title: string; version: number; language: string } | null
  job: { id: string; parsedJson: JobParsed } | null
  revisedCv: { id: string; title: string; version: number; language: string } | null
}

export type Patch = (input: Record<string, unknown>) => Promise<void>
export type CvOption = { id: string; title: string; version: number }
export type JobOption = { id: string; parsedJson: JobParsed }
export type CvFull = { id: string; title: string; version: number; language: string; rawText: string; structuredJson: CvStructured }
export type AnalysisDetail = {
  id: string
  matchScore: number
  gapsJson: Gap[]
  suggestionsJson: { suggestions: Suggestion[] }
  language: string
}

export function squash(text: string) {
  return text.replace(/\s+/g, " ").trim()
}

export function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function applySuggestionToText(text: string, s: Suggestion): { text: string; applied: boolean } {
  if (!s.before || !s.after) return { text, applied: false }
  if (text.includes(s.before)) return { text: text.replace(s.before, s.after), applied: true }
  try {
    const pattern = s.before.trim().split(/\s+/).map(escapeRegExp).join("\\s+")
    const re = new RegExp(pattern)
    if (re.test(text)) return { text: text.replace(re, s.after), applied: true }
  } catch {}
  return { text, applied: false }
}
