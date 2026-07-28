import {
  COVER_LETTER_ENGINE_VERSION,
  coverLetterDraftSchema,
  type CoverLetterLanguage,
  type CoverLetterLength,
  type CoverLetterResult,
  type CoverLetterTone,
  type CvStructured,
  type JobParsed,
} from "@dilirik/shared"
import { generateStructured } from "../generateStructured"
import {
  buildCoverLetterPrompt,
  buildCoverLetterSystemPrompt,
  type CoverLetterAnalysisContext,
} from "./prompt"
import { filterCoverLetterDraft, renderCoverLetterText } from "./postCheck"

export class EmptyCoverLetterError extends Error {
  constructor(readonly reasons: string[]) {
    super("Seluruh paragraf surat ditolak guardrail kejujuran")
    this.name = "EmptyCoverLetterError"
  }
}

export type GenerateCoverLetterArgs = {
  cv: CvStructured
  job: JobParsed
  language: CoverLetterLanguage
  tone: CoverLetterTone
  length: CoverLetterLength
  analysis?: CoverLetterAnalysisContext
}

/**
 * Pipeline cover letter — SATU panggilan LLM (hemat token & konsisten), lalu
 * guardrail post-check menyaring paragraf yang tidak punya jejak di CV.
 *
 * Kalau SEMUA paragraf ditolak, kita TIDAK menyajikan surat setengah jadi:
 * lebih baik gagal jujur (EmptyCoverLetterError) daripada mengirim surat yang
 * mengarang — sejalan dengan posisi produk di PRD §8.
 */
export async function generateCoverLetter(
  args: GenerateCoverLetterArgs,
): Promise<CoverLetterResult> {
  const raw = await generateStructured({
    schema: coverLetterDraftSchema,
    system: buildCoverLetterSystemPrompt(args.language),
    prompt: buildCoverLetterPrompt(args),
  })

  const { draft, rejected } = filterCoverLetterDraft(raw, args.cv)
  if (draft.bodyParagraphs.length === 0) {
    throw new EmptyCoverLetterError(rejected.map((item) => item.reason))
  }

  return {
    draft,
    text: renderCoverLetterText(draft),
    rejectedParagraphs: rejected,
    language: args.language,
    tone: args.tone,
    length: args.length,
    engineVersion: COVER_LETTER_ENGINE_VERSION,
  }
}
