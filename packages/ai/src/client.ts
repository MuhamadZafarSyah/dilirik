import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import type { LanguageModelV1 } from "ai"

/**
 * LLM client provider-agnostic (PRD §13).
 * Cukup ganti env LLM_BASE_URL / LLM_API_KEY / LLM_MODEL untuk pindah provider
 * (OpenRouter, opencode, OpenAI, Groq, dll — semua OpenAI-compatible).
 * API key = milik platform (developer), bukan BYO end-user.
 */
export function getLlm(): LanguageModelV1 {
  const baseURL = process.env.LLM_BASE_URL
  const apiKey = process.env.LLM_API_KEY
  const model = process.env.LLM_MODEL ?? "fable-5"
  if (!baseURL || !apiKey) {
    throw new Error("LLM_BASE_URL dan LLM_API_KEY wajib di-set (lihat .env.example)")
  }
  const provider = createOpenAICompatible({ name: "dilirik-llm", baseURL, apiKey })
  return provider(model)
}

