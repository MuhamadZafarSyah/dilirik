import { z } from "zod"
import { generateStructured } from "../generateStructured"

/**
 * Feedback pasca-sesi mock interview (T-M5-13) — satu panggilan LLM non-live
 * (model teks murah), output wajib lolos schema Zod (guardrail titik-2).
 */
export const interviewFeedbackSchema = z.object({
  overallScore: z.number().min(0).max(100),
  summary: z.string().min(1),
  strengths: z.array(z.string()).max(6),
  improvements: z
    .array(
      z.object({
        point: z.string(),
        example: z.string(), // contoh konkret jawaban yang lebih baik
      }),
    )
    .max(6),
  questionReviews: z
    .array(
      z.object({
        question: z.string(),
        answerSummary: z.string(),
        feedback: z.string(),
        score: z.number().min(0).max(100),
      }),
    )
    .max(12),
})

export type InterviewFeedback = z.infer<typeof interviewFeedbackSchema>

const SYSTEM_PROMPT = [
  "Kamu adalah coach interview berpengalaman yang menilai TRANSKRIP sesi latihan mock interview.",
  "Prinsip:",
  "- Nilai HANYA dari apa yang benar-benar diucapkan kandidat di transkrip — jangan mengarang jawaban yang tidak ada.",
  "- Jujur tapi membangun: sebutkan kekuatan nyata, dan perbaikan yang spesifik + actionable.",
  "- Untuk setiap perbaikan, beri contoh kalimat jawaban yang lebih baik (field `example`).",
  "- Skor konservatif: 50 = rata-rata, 70+ = baik, 85+ = sangat baik dan jarang.",
  "- Transkrip berasal dari speech-to-text — abaikan salah eja/tanda baca, fokus ke substansi.",
].join("\n")

export async function generateInterviewFeedback(args: {
  transcript: Array<{ role: "interviewer" | "candidate"; text: string }>
  language: string
  /** Konteks singkat sesi, mis. judul "Interview: Frontend Engineer". */
  context?: string
}): Promise<InterviewFeedback> {
  const transcriptText = args.transcript
    .map((t) => `${t.role === "interviewer" ? "Pewawancara" : "Kandidat"}: ${t.text}`)
    .join("\n")

  const langLine =
    args.language === "id"
      ? "Tulis seluruh feedback dalam Bahasa Indonesia."
      : `Tulis seluruh feedback dalam bahasa dengan kode "${args.language}" (bahasa sesi kandidat).`

  const prompt = [
    args.context ? `Konteks sesi: ${args.context}` : null,
    langLine,
    "",
    "Transkrip sesi:",
    transcriptText,
  ]
    .filter((line) => line !== null)
    .join("\n")

  return generateStructured({ schema: interviewFeedbackSchema, system: SYSTEM_PROMPT, prompt })
}
