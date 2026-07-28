import type { CvStructured, JobParsed } from "@dilirik/shared"
import {
  COVER_LETTER_LENGTH_SPECS,
  type CoverLetterLanguage,
  type CoverLetterLength,
  type CoverLetterTone,
} from "@dilirik/shared"
import { HONESTY_SYSTEM_PROMPT } from "../guardrail/systemPrompt"

/** Konteks opsional dari hasil analisis — membuat surat menjawab gap, bukan mengulang CV. */
export type CoverLetterAnalysisContext = {
  matchScore: number
  careerNote: string
  /** Hanya gap yang relevan diringkas ke prompt (skill + tipe + severity). */
  gaps: Array<{ skill: string; type: string; severity: string }>
}

export type CoverLetterPromptArgs = {
  cv: CvStructured
  job: JobParsed
  language: CoverLetterLanguage
  tone: CoverLetterTone
  length: CoverLetterLength
  analysis?: CoverLetterAnalysisContext
}

const TONE_DIRECTION: Record<CoverLetterTone, { id: string; en: string }> = {
  SANTAI: {
    id: "Hangat dan membumi. Boleh memakai kalimat pendek dan sapaan yang ramah, tapi tetap sopan dan tidak slengean.",
    en: "Warm and down-to-earth. Short, friendly sentences are fine, but stay polite and never sloppy.",
  },
  PROFESIONAL: {
    id: "Netral, rapi, dan lugas. Hindari jargon berlebihan maupun bahasa yang terlalu kaku.",
    en: "Neutral, polished, and direct. Avoid both heavy jargon and overly stiff phrasing.",
  },
  ANTUSIAS: {
    id: "Energik dan menunjukkan motivasi. Tunjukkan semangat lewat alasan konkret, BUKAN lewat kata sifat berlebihan.",
    en: "Energetic and motivated. Show enthusiasm through concrete reasons, NOT through inflated adjectives.",
  },
  FORMAL: {
    id: "Baku dan konservatif, sesuai surat resmi Indonesia. Gunakan sapaan dan salam penutup formal.",
    en: "Formal and conservative, in the register of an official business letter.",
  },
}

function bullet(items: string[], limit = 12): string {
  const cleaned = items.map((s) => s.trim()).filter(Boolean).slice(0, limit)
  return cleaned.length > 0 ? cleaned.map((s) => `- ${s}`).join("\n") : "- (tidak ada)"
}

/** Ringkasan CV yang dikirim ke LLM — hanya fakta, tidak ada teks bebas tambahan. */
function renderCv(cv: CvStructured): string {
  const experiences = cv.experiences.map((exp) => {
    const head = [exp.title, exp.company].filter(Boolean).join(" — ")
    const highlights = exp.highlights.map((h) => `    * ${h}`).join("\n")
    return highlights ? `- ${head}\n${highlights}` : `- ${head}`
  })
  const education = cv.education.map((edu) =>
    [edu.degree, edu.institution].filter(Boolean).join(" — "),
  )
  const extra = (cv.sections ?? []).map(
    (section) => `- ${section.label}: ${section.items.join("; ")}`,
  )

  return [
    `Nama: ${cv.fullName || "(tidak disebut)"}`,
    `Headline: ${cv.headline || "(tidak disebut)"}`,
    `Tentang: ${cv.about || "(tidak disebut)"}`,
    "",
    "Skill:",
    bullet(cv.skills, 30),
    "",
    "Pengalaman:",
    experiences.length > 0 ? experiences.join("\n") : "- (tidak ada)",
    "",
    "Pencapaian:",
    bullet(cv.achievements, 15),
    "",
    "Pendidikan:",
    bullet(education, 6),
    "",
    "Bagian lain:",
    extra.length > 0 ? extra.join("\n") : "- (tidak ada)",
  ].join("\n")
}

function renderJob(job: JobParsed): string {
  return [
    `Posisi: ${job.jobTitle || "(tidak disebut)"}`,
    `Perusahaan: ${job.company || "(tidak disebut)"}`,
    `Level: ${job.level || "(tidak disebut)"}`,
    "",
    "Wajib (must-have):",
    bullet(job.mustHaveSkills, 15),
    "",
    "Nilai plus (nice-to-have):",
    bullet(job.niceToHaveSkills, 10),
    "",
    "Requirement lain:",
    bullet(job.requirements, 12),
  ].join("\n")
}

function renderAnalysis(analysis: CoverLetterAnalysisContext): string {
  const realGaps = analysis.gaps.filter((g) => g.type === "real" && g.severity === "must")
  return [
    "",
    "=== KONTEKS HASIL ANALISIS (sudah dihitung sistem, jangan dihitung ulang) ===",
    `Skor kecocokan: ${analysis.matchScore}/100`,
    analysis.careerNote ? `Catatan karier: ${analysis.careerNote}` : "",
    realGaps.length > 0
      ? `Gap NYATA yang tidak ada di CV (DILARANG diklaim dimiliki): ${realGaps
          .map((g) => g.skill)
          .join(", ")}`
      : "Tidak ada gap must-have yang nyata.",
  ]
    .filter(Boolean)
    .join("\n")
}

/**
 * Guardrail titik-1 untuk cover letter: system prompt kejujuran umum + aturan
 * khusus surat lamaran (setiap paragraf badan wajib membawa evidenceFromCv).
 */
export function buildCoverLetterSystemPrompt(language: CoverLetterLanguage): string {
  const languageRule =
    language === "en"
      ? "Write the ENTIRE letter in English, including greeting and sign-off."
      : "Tulis SELURUH isi surat dalam Bahasa Indonesia, termasuk sapaan dan salam penutup."

  return `${HONESTY_SYSTEM_PROMPT}

Kamu sekarang menulis SURAT LAMARAN (cover letter).
ATURAN TAMBAHAN KHUSUS SURAT LAMARAN:
6. Setiap paragraf badan surat WAJIB mengisi \`evidenceFromCv\`: kutipan fakta yang BENAR-BENAR tertulis di data CV (skill, judul pekerjaan, nama perusahaan, highlight, pencapaian, atau pendidikan). Kutip semirip mungkin dengan teks aslinya.
7. DILARANG menyebut angka, durasi kerja, nama perusahaan, gelar, atau tools yang tidak ada di data CV. Kalau ragu, jangan tulis.
8. Untuk skill yang diminta lowongan tapi TIDAK ada di CV: jangan diklaim. Kalau perlu disinggung, bingkai jujur sebagai kemauan belajar — dan tetap dasarkan pada fakta CV yang relevan.
9. Jangan menulis placeholder seperti [Nama Perusahaan] atau [isi di sini]. Kalau datanya tidak ada, susun kalimat yang tetap wajar tanpa placeholder.
10. Tanpa basa-basi kosong ("saya adalah kandidat terbaik", "dengan segala kerendahan hati"). Setiap kalimat harus membawa informasi.
11. ${languageRule}`
}

export function buildCoverLetterPrompt(args: CoverLetterPromptArgs): string {
  const spec = COVER_LETTER_LENGTH_SPECS[args.length]
  const tone = TONE_DIRECTION[args.tone]
  const toneLine = args.language === "en" ? tone.en : tone.id

  return [
    "=== DATA CV KANDIDAT (satu-satunya sumber fakta yang boleh dipakai) ===",
    renderCv(args.cv),
    "",
    "=== LOWONGAN YANG DILAMAR ===",
    renderJob(args.job),
    args.analysis ? renderAnalysis(args.analysis) : "",
    "",
    "=== INSTRUKSI PENULISAN ===",
    `Tone: ${toneLine}`,
    `Panjang total surat: sekitar ${spec.minWords}–${spec.maxWords} kata.`,
    `Jumlah paragraf badan (bodyParagraphs): tepat ${spec.bodyParagraphs}.`,
    "",
    "Susun surat dengan struktur:",
    "- greeting: sapaan ke perekrut/perusahaan (pakai nama perusahaan bila diketahui).",
    "- opening: sebut posisi yang dilamar dan satu alasan konkret yang berakar pada fakta CV.",
    `- bodyParagraphs: ${spec.bodyParagraphs} paragraf. Tiap paragraf menghubungkan SATU requirement lowongan (isi di targetRequirement) dengan bukti nyata dari CV (isi di evidenceFromCv). Prioritaskan must-have yang memang tercermin di CV.`,
    "- closing: ajakan sopan untuk lanjut ke tahap berikutnya.",
    "- signOff: salam penutup + nama kandidat bila tersedia di CV.",
    "",
    "Ingat: `evidenceFromCv` akan diverifikasi otomatis terhadap isi CV. Paragraf dengan bukti yang tidak ditemukan AKAN DIBUANG, jadi kutip fakta yang benar-benar ada.",
  ]
    .filter(Boolean)
    .join("\n")
}
