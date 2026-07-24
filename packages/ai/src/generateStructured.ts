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

/**
 * Guardrail titik-2: SEMUA output AI wajib lolos schema Zod.
 * Retry dengan backoff; kalau tetap gagal → throw supaya caller bisa fallback
 * (mis. scoring semantic → fallback rule-based).
 */
export async function generateStructured<TSchema extends z.ZodTypeAny>(args: {
  schema: TSchema
  system: string
  prompt: string
  maxRetries?: number
}): Promise<z.infer<TSchema>> {
  const { schema, system, prompt, maxRetries = 2 } = args
  let lastError: unknown
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const { object } = await generateObject({
        model: getLlm(),
        schema,
        system,
        prompt,
        temperature: 0.2,
      })
      return schema.parse(object)
    } catch (error) {
      lastError = error
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
