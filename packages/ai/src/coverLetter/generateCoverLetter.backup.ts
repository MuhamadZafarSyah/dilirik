import { z } from "zod"
import { generateStructured } from "../generateStructured.js"
import { HONESTY_SYSTEM_PROMPT } from "../guardrail/systemPrompt.js"

export const coverLetterAiResultSchema = z.object({
  text: z.string().describe("Teks lengkap surat lamaran pekerjaan (header, salam, pembuka, isi, penutup, tanda tangan)"),
  relevanceScore: z.number().int().min(0).max(100).describe("Skor relevansi kualifikasi terhadap lowongan (0-100)"),
})

export type CoverLetterAiResult = z.infer<typeof coverLetterAiResultSchema>

export type GenerateCoverLetterParams = {
  cvText: string
  cvTitle?: string
  jobText: string
  analysisScore?: number
  analysisGaps?: string[]
  analysisSuggestions?: string[]
  language?: "id" | "en"
  template?: "professional" | "modern" | "creative"
  customInstructions?: string
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export async function generateCoverLetter(params: GenerateCoverLetterParams): Promise<{
  text: string
  relevanceScore: number
  wordCount: number
  language: "id" | "en"
}> {
  const language = params.language ?? "id"
  const template = params.template ?? "professional"

  const langInstruction =
    language === "en"
      ? "Write the entire cover letter in formal, professional English."
      : "Tulis seluruh surat lamaran dalam bahasa Indonesia formal dan profesional."

  const templateInstruction =
    template === "modern"
      ? "Use a clean, modern style highlighting key bullet points for achievements."
      : template === "creative"
        ? "Use an engaging storytelling approach with a personal touch."
        : "Use a classic formal business structure suitable for corporate job applications."

  const system = `${HONESTY_SYSTEM_PROMPT}

You are an expert career advisor and professional writer specializing in job applications.
Your task is to generate a personalized, compelling cover letter.

Guidelines:
- ${langInstruction}
- ${templateInstruction}
- Target length: between 250 and 400 words.
- NEVER fabricate skills, achievements, or work history not present in the CV.
- Address gaps strategically by highlighting transferable skills or willingness to learn.
- Include recipient placeholder, date, salutation, opening, body, closing, and signature block.

Structure:
1. Header (Date, To: HR Manager / Hiring Manager, Company Name)
2. Salutation (Dengan hormat / Dear Hiring Manager)
3. Opening paragraph (position applied for, motivation)
4. Body paragraph(s) (key achievements from CV matching job requirements)
5. Closing paragraph (call to action, interview request)
6. Signature block`

  const promptParts: string[] = [
    `Language: ${language.toUpperCase()}`,
    `Template: ${template}`,
    `\n**Job Posting:**\n${params.jobText.slice(0, 4000)}`,
    `\n**Candidate CV (${params.cvTitle ?? "CV"}):**\n${params.cvText.slice(0, 6000)}`,
  ]

  if (params.analysisScore !== undefined) {
    promptParts.push(`\n**Analysis Match Score:** ${params.analysisScore}/100`)
  }
  if (params.analysisGaps && params.analysisGaps.length > 0) {
    promptParts.push(`**Identified Gaps:**\n${params.analysisGaps.map((g) => `- ${g}`).join("\n")}`)
  }
  if (params.analysisSuggestions && params.analysisSuggestions.length > 0) {
    promptParts.push(`**Key Suggestions:**\n${params.analysisSuggestions.map((s) => `- ${s}`).join("\n")}`)
  }

  if (params.customInstructions?.trim()) {
    promptParts.push(`\n**User Custom Instructions:**\n${params.customInstructions.trim()}`)
  }

  const result = await generateStructured({
    schema: coverLetterAiResultSchema,
    system,
    prompt: promptParts.join("\n"),
    maxRetries: 2,
  })

  const wordCount = countWords(result.text)

  return {
    text: result.text,
    relevanceScore: result.relevanceScore,
    wordCount,
    language,
  }
}
