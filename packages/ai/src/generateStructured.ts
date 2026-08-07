import { generateObject } from "ai"
import type { z } from "zod"
import { getLlm } from "./client"

export class StructuredOutputError extends Error {
  constructor(
    message: string,
    readonly attempts: number,
  ) {
    super(message)
    this.name = "StructuredOutputError"
  }
}

/** Ubah error validasi jadi instruksi perbaikan yang bisa dibaca model. */
function describeError(error: unknown): string {
  if (error && typeof error === "object" && "issues" in error) {
    const issues = (error as { issues: Array<{ path: Array<string | number>; message: string }> })
      .issues
    if (Array.isArray(issues) && issues.length > 0) {
      return issues
        .map((issue) => `- ${issue.path.join(".") || "(root)"}: ${issue.message}`)
        .join("\n")
    }
  }
  return String(error)
}

/**
 * Guardrail titik-2: SEMUA output AI wajib lolos schema Zod.
 *
 * Engine v3 menambahkan REPAIR LOOP: percobaan ulang tidak lagi mengirim prompt
 * yang persis sama (yang kemungkinan besar gagal dengan cara yang sama), tapi
 * menyertakan alasan penolakan validator supaya model memperbaiki bagian yang
 * salah saja. `temperature` juga bisa diatur per pemanggilan — tugas parsing
 * butuh 0 (deterministik), tugas menulis ulang butuh sedikit variasi.
 */
export async function generateStructured<TSchema extends z.ZodTypeAny>(args: {
  schema: TSchema
  system: string
  prompt: string
  maxRetries?: number
  temperature?: number
}): Promise<z.infer<TSchema>> {
  const { schema, system, prompt, maxRetries = 2, temperature = 0.2 } = args
  let lastError: unknown
  let repairHint = ""
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const { object } = await generateObject({
        model: getLlm(),
        schema,
        system,
        prompt: repairHint ? `${prompt}\n\n${repairHint}` : prompt,
        temperature,
      })
      return schema.parse(object)
    } catch (error) {
      lastError = error
      repairHint = [
        "## PERBAIKI OUTPUT SEBELUMNYA",
        "Output percobaanmu yang lalu DITOLAK validator dengan alasan berikut:",
        describeError(error),
        "Perbaiki HANYA bagian yang salah. Tetap patuhi schema dan JANGAN mengarang data baru untuk menambal error.",
      ].join("\n")
      if (attempt <= maxRetries) {
        await new Promise((r) => setTimeout(r, 400 * attempt))
      }
    }
  }
  throw new StructuredOutputError(
    `Output LLM tidak valid setelah ${maxRetries + 1} percobaan: ${String(lastError)}`,
    maxRetries + 1,
  )
}
