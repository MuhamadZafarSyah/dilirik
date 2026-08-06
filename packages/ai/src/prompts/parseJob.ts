import type { JobParsed } from "@dilirik/shared"
import { generateStructured } from "../generateStructured"
import { JOB_EXTRACTION_SYSTEM_PROMPT, strictJobParsedSchema } from "./jobExtraction"

/**
 * Parse teks lowongan → parsedJson (PRD §7.3): wajib vs opsional dipisah.
 *
 * Fungsi ini sengaja tipis. Cara meminta dan syarat penerimaan hidup di
 * ./jobExtraction supaya keduanya bisa diuji tanpa memanggil LLM.
 *
 * temperature 0 karena ini tugas MENYALIN, bukan mengarang: dua kali parse atas
 * lowongan yang sama harus menghasilkan daftar skill yang sama. parseCv sengaja
 * dibiarkan pada default 0.2 di PR ini agar perubahan perilaku tetap satu topik.
 */
export async function parseJob(rawText: string): Promise<JobParsed> {
  return generateStructured({
    schema: strictJobParsedSchema,
    system: JOB_EXTRACTION_SYSTEM_PROMPT,
    prompt: `## Teks lowongan\n${rawText}`,
    temperature: 0,
  })
}
