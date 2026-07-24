import { jobParsedSchema, type JobParsed } from "@dilirik/shared"
import { generateStructured } from "../generateStructured"

/** Parse teks lowongan → parsedJson (PRD §7.3): wajib vs opsional dipisah. */
export async function parseJob(rawText: string): Promise<JobParsed> {
  return generateStructured({
    schema: jobParsedSchema,
    system:
      "Ekstrak requirement lowongan kerja apa adanya. Pisahkan mustHaveSkills (wajib/required) dari niceToHaveSkills (plus/preferred). Sertakan level & keywords ATS penting.",
    prompt: `## Teks lowongan\n${rawText}`,
  })
}
