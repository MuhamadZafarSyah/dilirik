import { gapsSchema, type CvStructured, type Gap, type JobParsed } from "@dilirik/shared"
import { generateStructured } from "../generateStructured"
import { HONESTY_SYSTEM_PROMPT, languageInstruction } from "../guardrail/systemPrompt"

/**
 * Analisis gap (PRD \u00a78.4) \u2014 tiga jenis:
 * - "real": skill benar-benar tidak ada \u2192 saran jujur (belajar, proyek kecil, dsb).
 * - "presentation": dimiliki tapi tidak terlihat \u2192 saran memunculkan fakta.
 * - "implied": sudah dipastikan dikuasai lewat skill lain \u2192 BUKAN kekurangan.
 *
 * Catatan desain (v3.1): versi lama menyodorkan daftar kandidat berlabel "skill
 * lowongan yang tidak terdeteksi di CV", lalu bertanya apakah itu gap. Label itu
 * menanamkan premis dan model cenderung mengonfirmasinya \u2014 sumber vonis palsu
 * seperti "tidak ada bukti pengalaman HTML" pada CV yang penuh React. Sekarang
 * labelnya netral dan model diberi izin eksplisit untuk menolak premisnya.
 */
export async function analyzeGaps(args: {
  cv: CvStructured
  job: JobParsed
  missingMust: string[]
  missingNice: string[]
  impliedCovered?: Array<{ skill: string; evidence: string[] }>
  language: string
}): Promise<Gap[]> {
  const { cv, job, missingMust, missingNice, impliedCovered = [], language } = args
  const result = await generateStructured({
    schema: gapsSchema,
    system: [
      HONESTY_SYSTEM_PROMPT,
      languageInstruction(language),
      `Klasifikasikan tiap kandidat: "real" jika benar-benar tidak ada jejaknya di CV; "presentation" jika sebenarnya ada fakta terkait di CV tapi tidak tersaji jelas; "implied" jika kandidat itu PASTI dikuasai karena skill lain yang ada di CV (mis. orang yang membangun aplikasi React pasti menguasai HTML dan CSS).`,
      `Kandidat di bawah berasal dari pencocokan kata harfiah, jadi WAJAR kalau sebagian bukan kekurangan sungguhan. Kamu BOLEH dan HARUS menolak premisnya bila memang begitu \u2014 jangan memaksakan penjelasan untuk sesuatu yang sebenarnya sudah dikuasai kandidat.`,
      `Skill yang kamu klasifikasikan "implied" DILARANG diberi advice bernada kekurangan seperti "perlu belajar" atau "perlu menambahkan pengalaman".`,
    ].join("\n"),
    prompt: [
      "## CV (structured JSON)",
      JSON.stringify(cv),
      "## Lowongan (parsed JSON)",
      JSON.stringify(job),
      "## Kandidat untuk diklasifikasikan (hasil pencocokan kata harfiah, belum tentu kekurangan)",
      JSON.stringify({ missingMust, missingNice }),
      "## Sudah dipastikan tercakup lewat implikasi skill (JANGAN perlakukan sebagai kekurangan)",
      JSON.stringify(impliedCovered),
      "Untuk tiap gap: type, skill, explanation (kenapa dianggap gap), advice (langkah konkret & jujur).",
    ].join("\n"),
  })
  return result.gaps
}
