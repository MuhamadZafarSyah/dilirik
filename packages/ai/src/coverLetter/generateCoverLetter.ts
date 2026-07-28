import { z } from "zod"
import { generateStructured } from "../generateStructured.js"
import { HONESTY_SYSTEM_PROMPT } from "../guardrail/systemPrompt.js"

/**
 * Pembuat surat lamaran.
 *
 * Perubahan pendekatan dibanding versi sebelumnya:
 *
 * 1. Model TIDAK lagi diminta menulis satu blok surat utuh. Model hanya
 *    mengarang bagian yang memang butuh penalaran (pembuka, paragraf bukti,
 *    paragraf kecocokan, penutup). Bagian yang bentuknya tetap - baris tujuan,
 *    salam, dan tanda tangan - disusun oleh kode ini. Model kelas menengah
 *    paling sering gagal justru di bagian tetap itu: menempel tempat dan
 *    tanggal, menulis nama perusahaan dua kali, atau menutup dengan "Saya
 *    hormat" yang tidak baku. Kalau bagian itu tidak pernah diserahkan ke
 *    model, kesalahannya mustahil terjadi.
 *
 * 2. Ada tahap pembersihan dan pemeriksaan deterministik setelah model selesai.
 *    Kalimat klise, tanggal yang tetap lolos, placeholder kurung siku, dan
 *    kutipan yang tidak ada di CV dideteksi di sini. Kalau pelanggarannya
 *    berat, model dipanggil sekali lagi dengan daftar kesalahannya.
 *
 * 3. Struktur suratnya mengikuti pola yang jamak dipakai panduan karier arus
 *    utama (Harvard Office of Career Services, Yale OCS, MIT CAPD, The Muse):
 *    satu pembuka yang menyebut posisi dan alasan spesifik, satu sampai dua
 *    paragraf bukti dengan hasil terukur, satu paragraf kecocokan dengan
 *    perusahaan, lalu penutup berisi ajakan konkret. Pola ini yang membuat
 *    surat terasa ditulis manusia, bukan panjangnya.
 */

/** Bagian surat yang dikarang model. Header dan tanda tangan tidak termasuk. */
export const coverLetterSectionsSchema = z.object({
  candidateName: z
    .string()
    .describe("Nama lengkap kandidat, disalin apa adanya dari CV. Tanpa gelar kecuali gelar itu tertulis di CV."),
  positionTitle: z
    .string()
    .describe("Nama posisi persis seperti tertulis di lowongan, misalnya 'Fullstack Developer'."),
  companyName: z
    .string()
    .describe("Nama perusahaan persis seperti tertulis di lowongan, tanpa bentuk badan usaha ganda."),
  recipientName: z
    .string()
    .describe(
      "Nama atau jabatan penerima HANYA jika disebutkan di lowongan, misalnya 'Ibu Sari Dewi'. Kosongkan jika tidak disebutkan.",
    ),
  openingParagraph: z
    .string()
    .describe(
      "Paragraf pembuka, 2 sampai 3 kalimat utuh. Menyebut posisi yang dilamar dan satu alasan spesifik yang merujuk isi lowongan.",
    ),
  evidenceParagraphs: z
    .array(z.string())
    .min(1)
    .max(2)
    .describe(
      "Satu sampai dua paragraf bukti. Tiap paragraf mengangkat SATU pengalaman terkuat dengan hasil terukur, bukan daftar semua proyek.",
    ),
  fitParagraph: z
    .string()
    .describe(
      "Satu paragraf, 2 sampai 3 kalimat, tentang kecocokan dengan kebutuhan yang disebut lowongan. Boleh menyebut kekurangan secara jujur bila relevan.",
    ),
  closingParagraph: z
    .string()
    .describe(
      "Paragraf penutup, 2 kalimat. Berisi kesediaan untuk wawancara dan ucapan terima kasih. Tanpa kata penutup surat dan tanpa nama.",
    ),
  evidenceQuotes: z
    .array(z.string())
    .min(1)
    .max(6)
    .describe("Kutipan pendek yang disalin PERSIS dari teks CV sebagai dasar setiap klaim di paragraf bukti."),
  relevanceScore: z
    .number()
    .int()
    .min(0)
    .max(100)
    .describe("Skor relevansi kualifikasi kandidat terhadap lowongan, 0 sampai 100."),
})

export type CoverLetterSections = z.infer<typeof coverLetterSectionsSchema>

/**
 * Bentuk hasil versi lama.
 *
 * @deprecated Dipertahankan supaya modul lain yang masih mengimpornya tidak
 * ikut rusak. Alur pembuatan surat kini memakai `coverLetterSectionsSchema`.
 */
export const coverLetterAiResultSchema = z.object({
  text: z.string(),
  relevanceScore: z.number().int().min(0).max(100),
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
  /** Menimpa nama yang dibaca model dari CV. Dipakai bila profil pengguna sudah memuat nama resmi. */
  candidateName?: string
}

export type GenerateCoverLetterResult = {
  text: string
  relevanceScore: number
  wordCount: number
  language: "id" | "en"
  /** Catatan mutu yang masih tersisa setelah pembersihan. Berguna untuk log dan pemantauan kualitas model. */
  qualityIssues: string[]
  /** Jumlah kutipan yang diklaim model tetapi tidak ditemukan di teks CV. */
  unverifiedQuotes: number
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

/* -------------------------------------------------------------------------- */
/* Kamus frasa yang dilarang                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Frasa yang muncul di hampir semua surat lamaran hasil AI.
 *
 * Masalahnya bukan sekadar klise. Frasa seperti ini tidak membawa informasi,
 * sehingga memakan kuota kata yang seharusnya dipakai untuk bukti. Daftar ini
 * dipakai dua kali: disisipkan ke prompt sebagai larangan, dan dipakai lagi
 * untuk memeriksa hasil akhir.
 */
const BANNED_PHRASES_ID: readonly string[] = [
  "kontribusi yang signifikan",
  "belajar dan tumbuh bersama",
  "berkontribusi pada kesuksesan perusahaan",
  "berkontribusi pada pertumbuhan perusahaan",
  "saya adalah pribadi yang",
  "pekerja keras dan mampu bekerja dalam tim",
  "sesuai dengan kualifikasi yang bapak/ibu butuhkan",
  "besar harapan saya",
  "sangat berharap dapat kesempatan",
  "atas perhatian bapak/ibu",
  "demikian surat lamaran ini saya buat",
  "dengan sebenar-benarnya",
  "saya yakin dapat",
  "telah berhasil",
  "selain itu, saya juga",
  "di era digital saat ini",
  "tidak hanya",
]

const BANNED_PHRASES_EN: readonly string[] = [
  "i am writing to express my interest",
  "i believe i would be a great fit",
  "significant contribution",
  "learn and grow with the team",
  "contribute to the success of the company",
  "hard worker and a team player",
  "thank you for your time and consideration",
  "i am confident that",
  "in today's fast-paced world",
  "passionate about",
  "not only",
]

/** Nama bulan Indonesia dan Inggris, dipakai untuk mendeteksi baris tanggal yang tidak diminta. */
const MONTH_NAMES =
  "januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember|" +
  "january|february|march|april|may|june|july|august|september|october|november|december"

const DATE_LINE_PATTERN = new RegExp(`\\b\\d{1,2}\\s+(${MONTH_NAMES})\\s+\\d{4}\\b`, "i")
const NUMERIC_DATE_PATTERN = /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/

/* -------------------------------------------------------------------------- */
/* Penyusun prompt                                                            */
/* -------------------------------------------------------------------------- */

function buildSystemPrompt(
  language: "id" | "en",
  template: NonNullable<GenerateCoverLetterParams["template"]>,
): string {
  const bannedList = (language === "en" ? BANNED_PHRASES_EN : BANNED_PHRASES_ID)
    .map((phrase) => `- "${phrase}"`)
    .join("\n")

  const toneRule =
    template === "modern"
      ? "Tone: lugas dan ringkas, kalimat pendek, boleh satu daftar bernomor berisi maksimal tiga capaian di dalam paragraf bukti."
      : template === "creative"
        ? "Tone: bercerita dan personal, tetap sopan, mulai paragraf bukti dari satu situasi nyata yang tertulis di CV."
        : "Tone: formal bisnis yang wajar, tanpa bahasa kaku ala surat dinas, tanpa sapaan berulang."

  const languageRule =
    language === "en"
      ? "Tulis seluruh isi paragraf dalam bahasa Inggris profesional."
      : "Tulis seluruh isi paragraf dalam bahasa Indonesia baku yang mengalir wajar, seperti ditulis oleh pelamar sendiri."

  return `${HONESTY_SYSTEM_PROMPT}

Kamu penulis surat lamaran kerja. Kamu hanya menghasilkan ISI paragraf, bukan surat utuh.

## Yang TIDAK boleh kamu tulis
Sistem yang memanggilmu sudah menyusun sendiri bagian tetap surat. Karena itu jangan pernah menuliskan:
- tempat dan tanggal dalam bentuk apa pun
- baris tujuan seperti "Kepada" atau "Hiring Manager"
- salam pembuka seperti "Dengan hormat" atau "Dear"
- kata penutup seperti "Hormat saya" atau "Sincerely"
- nama pelamar di akhir paragraf
- placeholder dalam kurung siku, kurung kurawal, atau teks seperti "Nama Anda"
Menuliskannya membuat surat punya dua header dan dua tanda tangan.

## Aturan isi
- ${languageRule}
- ${toneRule}
- Total seluruh paragraf 200 sampai 320 kata. Surat yang lebih panjang dari satu halaman jarang dibaca.
- Setiap klaim WAJIB berasal dari teks CV. Kalau lowongan meminta hal yang tidak ada di CV, jangan mengarang; boleh disebut jujur di paragraf kecocokan.
- Angka hanya boleh ditulis kalau angka itu benar-benar ada di CV. Jangan mengarang persentase.
- Pilih SATU sampai DUA pengalaman terkuat yang paling dekat dengan lowongan, lalu ceritakan dampaknya. Jangan mendaftar semua proyek. Daftar panjang membuat surat terbaca seperti CV yang diulang.
- Sebut nama perusahaan tujuan paling banyak dua kali di seluruh surat.
- Jangan mengulang isi paragraf pembuka di paragraf penutup.

## Aturan tata bahasa yang sering dilanggar
- Setiap kalimat harus utuh: ada subjek dan predikat. Jangan menyambung alasan dengan frasa buntung.
  SALAH: "Saya melamar posisi ini karena kesempatan untuk membangun aplikasi web yang kompleks."
  BENAR: "Saya melamar posisi ini karena Anda sedang membangun ulang platform trading, dan pekerjaan itu persis yang saya kerjakan dua tahun terakhir."
- Jangan menumpuk dua kata sambung dalam satu kalimat, misalnya "serta" dan "dan" sekaligus.
- Jangan memulai lebih dari satu paragraf dengan kata yang sama.
- Hindari bentuk pasif berantai seperti "telah dilakukan pengembangan terhadap".

## Frasa yang dilarang muncul
${bannedList}
Ganti dengan pernyataan konkret. Alih-alih "memberikan kontribusi yang signifikan", tulis apa yang kamu kerjakan dan apa hasilnya.

## Contoh paragraf pembuka yang baik
"Saya melamar posisi Fullstack Developer di Astronacci International. Lowongan Anda menyebut kebutuhan mengelola aplikasi web bervolume tinggi dengan Next.js dan Node.js, dan dua tahun terakhir saya mengerjakan tepat kombinasi itu di lingkungan produksi."
Perhatikan polanya: kalimat pertama menyatakan maksud, kalimat kedua mengaitkan kebutuhan di lowongan dengan pengalaman nyata. Tidak ada pujian kosong terhadap perusahaan.

## Contoh paragraf bukti yang baik
"Di PT Traspac Makmur Sejahtera saya membangun frontend Investment Learning Center untuk BKPM dengan SvelteKit dan TypeScript, sekaligus merawat pustaka lebih dari 100 komponen yang dipakai lintas proyek. Pustaka itu memotong waktu pengerjaan halaman baru dari beberapa hari menjadi hitungan jam."
Perhatikan: satu pengalaman, teknologi yang disebut lowongan, lalu dampaknya.

## evidenceQuotes
Untuk setiap klaim di paragraf bukti, salin potongan kalimat PERSIS dari teks CV sebagai dasar. Jangan menulis ulang dengan kata sendiri. Kutipan ini diverifikasi otomatis terhadap CV, dan klaim tanpa kutipan yang cocok akan ditandai.`
}

function buildUserPrompt(params: GenerateCoverLetterParams, issues: readonly string[]): string {
  const parts: string[] = [
    `## Lowongan\n${params.jobText.slice(0, 4000)}`,
    `## CV kandidat (${params.cvTitle ?? "CV"})\n${params.cvText.slice(0, 6000)}`,
  ]

  if (params.candidateName?.trim()) {
    parts.push(`## Nama kandidat (pakai ini, jangan cari di CV)\n${params.candidateName.trim()}`)
  }
  if (params.analysisScore !== undefined) {
    parts.push(`## Skor kecocokan hasil analisis\n${params.analysisScore} dari 100`)
  }
  if (params.analysisGaps?.length) {
    parts.push(
      `## Gap yang sudah terdeteksi\n${params.analysisGaps.map((gap) => `- ${gap}`).join("\n")}\n` +
      `Jangan tutupi gap ini dengan karangan. Kalau perlu disebut, sebut sekali dengan jujur di paragraf kecocokan.`,
    )
  }
  if (params.analysisSuggestions?.length) {
    parts.push(`## Saran dari analisis\n${params.analysisSuggestions.map((item) => `- ${item}`).join("\n")}`)
  }
  if (params.customInstructions?.trim()) {
    parts.push(`## Permintaan tambahan pengguna\n${params.customInstructions.trim()}`)
  }

  if (issues.length > 0) {
    parts.push(
      `## Perbaiki percobaan sebelumnya\nHasil sebelumnya ditolak karena hal berikut. Perbaiki semuanya:\n` +
      issues.map((issue) => `- ${issue}`).join("\n"),
    )
  }

  return parts.join("\n\n")
}

/* -------------------------------------------------------------------------- */
/* Pembersihan paragraf                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Membuang sisa header, salam, tanda tangan, tanggal, dan placeholder yang
 * kadang tetap ditulis model meski sudah dilarang.
 *
 * Pemeriksaan dilakukan baris demi baris, karena model biasanya menempelkannya
 * sebagai baris tersendiri di awal atau akhir paragraf.
 */
function cleanParagraph(input: string, language: "id" | "en"): string {
  const strayLine =
    language === "en"
      ? /^(dear\b|to whom|sincerely|best regards|yours\b|respectfully\b|hiring manager\b)/i
      : /^(dengan hormat|kepada\b|hormat saya|saya hormat|hormat kami|salam hormat|yth\.?|hiring manager\b|kepada yang terhormat)/i

  const lines = input
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => {
      if (line.length === 0) return false
      if (strayLine.test(line)) return false
      // Baris pendek berisi tanggal hampir pasti header tempat dan tanggal.
      if ((DATE_LINE_PATTERN.test(line) || NUMERIC_DATE_PATTERN.test(line)) && countWords(line) <= 8) return false
      // Placeholder yang belum diisi.
      if (/^[[{(].*[\]})]$/.test(line)) return false
      return true
    })

  return lines
    .join(" ")
    .replace(/\[[^\]]*\]/g, "") // buang [Nama Anda] di tengah kalimat
    .replace(/\{\{[^}]*\}\}/g, "")
    .replace(/\*\*/g, "") // sisa markdown
    .replace(/[\u2014\u2013]/g, "-") // tanda pisah panjang tidak dipakai
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim()
}

/** Merapikan nama perusahaan agar tidak jadi "PT Astronacci International Astronacci International". */
function cleanCompanyName(raw: string): string {
  const name = raw.trim().replace(/[.,;]+$/, "")
  const half = Math.floor(name.length / 2)
  const first = name.slice(0, half).trim()
  // Nama yang persis terulang dua kali dipotong jadi satu.
  if (first.length > 3 && name.slice(half).trim().toLowerCase() === first.toLowerCase()) return first
  return name
}

/* -------------------------------------------------------------------------- */
/* Penyusun surat                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Menyusun surat akhir dari bagian yang dikarang model.
 *
 * Header sengaja dibuat sesingkat mungkin: satu baris tujuan lalu satu salam.
 * Tempat dan tanggal tidak ditulis karena surat lamaran kini dikirim lewat
 * surel atau portal karier yang sudah punya penanda waktu sendiri, dan tanggal
 * yang salah justru membuat surat tampak didaur ulang.
 */
function composeLetter(
  sections: CoverLetterSections,
  params: GenerateCoverLetterParams,
  language: "id" | "en",
): string {
  const company = cleanCompanyName(sections.companyName)
  const recipient = sections.recipientName.trim().replace(/[.,;]+$/, "")
  const candidateName = (params.candidateName?.trim() || sections.candidateName.trim()).replace(/[.,;]+$/, "")

  const bodyParagraphs = [
    cleanParagraph(sections.openingParagraph, language),
    ...sections.evidenceParagraphs.map((paragraph: string) => cleanParagraph(paragraph, language)),
    cleanParagraph(sections.fitParagraph, language),
    cleanParagraph(sections.closingParagraph, language),
  ].filter((paragraph: string) => paragraph.length > 0)

  if (language === "en") {
    const salutation = recipient ? `Dear ${recipient},` : "Dear Hiring Manager,"
    return [
      company ? `${company}` : "",
      salutation,
      "",
      ...bodyParagraphs.flatMap((paragraph) => [paragraph, ""]),
      "Sincerely,",
      candidateName,
    ]
      .filter((line, index, all) => !(line === "" && all[index - 1] === ""))
      .join("\n")
      .trim()
  }

  // Baris tujuan disusun di sini supaya nama perusahaan tidak muncul dua kali.
  const recipientLine = recipient
    ? company
      ? `Kepada ${recipient} di ${company},`
      : `Kepada ${recipient},`
    : company
      ? `Kepada Tim Rekrutmen ${company},`
      : "Kepada Tim Rekrutmen,"

  return [
    recipientLine,
    "",
    "Dengan hormat,",
    "",
    ...bodyParagraphs.flatMap((paragraph) => [paragraph, ""]),
    "Hormat saya,",
    candidateName,
  ]
    .filter((line, index, all) => !(line === "" && all[index - 1] === ""))
    .join("\n")
    .trim()
}

/* -------------------------------------------------------------------------- */
/* Pemeriksaan mutu                                                           */
/* -------------------------------------------------------------------------- */

/** Menormalkan teks untuk pencocokan kutipan: huruf kecil, tanpa tanda baca, spasi tunggal. */
function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019\u201c\u201d"']/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Memeriksa apakah kutipan yang diklaim model benar-benar ada di CV.
 *
 * Pencocokan tidak dituntut persis satu banding satu, karena model sering
 * menyalin dengan beda tanda baca atau membuang satu kata. Kutipan dianggap
 * terbukti bila potongan tujuh kata pertamanya ditemukan di CV.
 */
function countUnverifiedQuotes(quotes: readonly string[], cvText: string): number {
  const haystack = normalizeForMatch(cvText)
  return quotes.filter((quote) => {
    const needle = normalizeForMatch(quote)
    if (needle.length < 12) return false // kutipan terlalu pendek untuk dinilai
    if (haystack.includes(needle)) return false
    const head = needle.split(" ").slice(0, 7).join(" ")
    return !haystack.includes(head)
  }).length
}

/**
 * Mengumpulkan pelanggaran pada surat yang sudah tersusun.
 *
 * Fungsi ini dipakai untuk dua hal: memutuskan perlu tidaknya satu kali
 * pemanggilan ulang model, dan dikembalikan ke pemanggil sebagai catatan mutu
 * agar penurunan kualitas model bisa dipantau tanpa membaca surat satu per satu.
 */
function collectQualityIssues(letter: string, language: "id" | "en", unverifiedQuotes: number): string[] {
  const issues: string[] = []
  const lower = letter.toLowerCase()
  const banned = language === "en" ? BANNED_PHRASES_EN : BANNED_PHRASES_ID

  for (const phrase of banned) {
    if (lower.includes(phrase)) issues.push(`Masih memakai frasa klise "${phrase}".`)
  }

  const body = letter.split("\n").slice(0, 4).join(" ")
  if (DATE_LINE_PATTERN.test(body) || NUMERIC_DATE_PATTERN.test(body)) {
    issues.push("Masih ada tempat atau tanggal di bagian atas surat.")
  }

  if (/\[[^\]]*\]|\{\{|nama anda|your name|xxx/i.test(letter)) {
    issues.push("Masih ada placeholder yang belum diisi.")
  }

  const words = countWords(letter)
  if (words < 180) issues.push(`Surat terlalu pendek (${words} kata), minimum 200 kata isi.`)
  if (words > 380) issues.push(`Surat terlalu panjang (${words} kata), maksimum 320 kata isi.`)

  if (unverifiedQuotes > 0) {
    issues.push(`${unverifiedQuotes} kutipan bukti tidak ditemukan di teks CV, jadi klaimnya belum terbukti.`)
  }

  // Kalimat sangat panjang adalah penanda paling andal dari kalimat yang tidak nyambung.
  const longSentence = letter.split(/(?<=[.!?])\s+/).find((sentence) => countWords(sentence) > 45)
  if (longSentence) issues.push("Ada kalimat lebih dari 45 kata, pecah menjadi beberapa kalimat.")

  return issues
}

/** Pelanggaran yang cukup berat untuk membenarkan satu kali pembuatan ulang. */
function needsRetry(issues: readonly string[]): boolean {
  return issues.some(
    (issue) =>
      issue.includes("klise") ||
      issue.includes("placeholder") ||
      issue.includes("terlalu pendek") ||
      issue.includes("terlalu panjang") ||
      issue.includes("belum terbukti"),
  )
}

/* -------------------------------------------------------------------------- */
/* Fungsi utama                                                               */
/* -------------------------------------------------------------------------- */

export async function generateCoverLetter(params: GenerateCoverLetterParams): Promise<GenerateCoverLetterResult> {
  const language = params.language ?? "id"
  const template = params.template ?? "professional"
  const system = buildSystemPrompt(language, template)

  let best: { letter: string; sections: CoverLetterSections; issues: string[]; unverified: number } | null = null

  // Dua putaran saja. Putaran kedua hanya dijalankan bila putaran pertama
  // melanggar hal berat, dan hasil terbaik dari keduanya yang dipakai.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const sections: CoverLetterSections = await generateStructured({
      schema: coverLetterSectionsSchema,
      system,
      prompt: buildUserPrompt(params, best?.issues ?? []),
      maxRetries: 2,
    })

    const letter = composeLetter(sections, params, language)
    const unverified = countUnverifiedQuotes(sections.evidenceQuotes, params.cvText)
    const issues = collectQualityIssues(letter, language, unverified)

    if (best === null || issues.length < best.issues.length) {
      best = { letter, sections, issues, unverified }
    }

    if (!needsRetry(issues)) break
  }

  // `best` selalu terisi karena loop berjalan minimal satu kali.
  const outcome = best!

  return {
    text: outcome.letter,
    relevanceScore: outcome.sections.relevanceScore,
    wordCount: countWords(outcome.letter),
    language,
    qualityIssues: outcome.issues,
    unverifiedQuotes: outcome.unverified,
  }
}
