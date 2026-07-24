import { cvStructuredSchema, type CvStructured } from "@dilirik/shared"
import { generateStructured } from "../generateStructured"
import { HONESTY_SYSTEM_PROMPT } from "../guardrail/systemPrompt"

/** Parse CV mentah → structuredJson (PRD §7.2). Tidak menambah info apapun. */
export async function parseCv(rawText: string): Promise<CvStructured> {
  return generateStructured({
    schema: cvStructuredSchema,
    system: `${HONESTY_SYSTEM_PROMPT}\nEkstrak struktur dari teks CV APA ADANYA. Jangan menambah, menebak, atau memperindah. Field yang tidak ada biarkan kosong/null.\n- "about": ringkasan / tentang saya / profil / objective PERSIS seperti tertulis (null bila tidak ada).\n- "sections": SEMUA section lain di luar skills/pengalaman/pencapaian/pendidikan — mis. Bahasa, Sertifikasi, Proyek, Organisasi, Publikasi — dengan label mengikuti judul section di CV dan items apa adanya. Jangan membuat section yang tidak ada di CV.`,
    prompt: `## Teks CV\n${rawText}`,
  })
}
