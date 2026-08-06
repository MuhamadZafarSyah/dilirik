/** Status pipeline lamaran — urutan sesuai PRD §7.5. */
export const APPLICATION_STATUSES = [
  "DISIMPAN",
  "DILAMAR",
  "SCREENING",
  "INTERVIEW",
  "OFFER",
  "DITOLAK",
] as const

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, { id: string; en: string }> = {
  DISIMPAN: { id: "Disimpan", en: "Saved" },
  DILAMAR: { id: "Dilamar", en: "Applied" },
  SCREENING: { id: "Screening", en: "Screening" },
  INTERVIEW: { id: "Interview", en: "Interview" },
  OFFER: { id: "Offer", en: "Offer" },
  DITOLAK: { id: "Ditolak", en: "Rejected" },
}

/**
 * Versi mesin analisis — naikkan saat prompt/pipeline berubah agar cache invalid.
 * v2.0.0: gaps+suggestions+careerNote digabung jadi SATU panggilan LLM (satu
 * rantai pemikiran), mode adaptif (optimize/reframe/honest_pivot) dari coverage
 * must-have, taksonomi gap, dan guardrail relevansi/anti-kosmetik.
 * v3.0.0: pencocokan skill berbasis token + peta alias (bukan substring dua
 * arah), schema saran v3 (addressesGap/whatChanged/rationale/impact), guardrail
 * 5 titik (anchor verbatim, kejujuran, frasa terlarang, kebergunaan, dedup),
 * repair loop pada output terstruktur, dan refund kuota saat pipeline gagal.
 * v3.1.0: graf implikasi skill (Next.js ⟹ React ⟹ JavaScript ⟹ HTML) dengan
 * confidence certain/likely + kedalaman maksimum 4, guardrail keenam
 * dropImpliedGaps yang membuang gap untuk skill yang jelas sudah dikuasai,
 * keluaran baru keywordGaps ("kata kunci hilang", bukan "gap beneran"), dan
 * pemecahan alias yang lebih ketat (svelte ≠ sveltekit, .net ≠ c#, git ≠ github).
 * v3.2.0: peta konsep ⟹ implementasi (OCR ← PaddleOCR, data visualization ←
 * ApexCharts, enkripsi ← AES-256-GCM) sebagai bahan gap "presentation";
 * instruksi diagnosis dipindahkan dari analysis/gaps.ts yang ternyata KODE MATI
 * ke analysis/report.ts yang benar-benar dieksekusi; gap presentation wajib
 * menyertakan evidenceQuote verbatim yang diverifikasi kode; promoteHintedGaps
 * menaikkan real → presentation secara deterministik sehingga bisa melahirkan
 * saran revisi; repairTemplateGaps menimpa kalimat cetakan "tidak ada
 * pengalaman atau pengetahuan tentang X"; dan guardrail ketujuh memastikan saran
 * benar-benar mengantarkan kata kunci gap yang diklaimnya.
 * v3.2.1: seluruh pertanyaan "apakah kalimat ini ada di CV" dipusatkan ke
 * guardrail/quoteLocator. Sebelumnya enforceGapEvidence dan postCheckAnchor
 * punya aturan pencocokan sendiri-sendiri, sehingga satu bullet CV yang sama
 * bisa LOLOS sebagai bukti gap tapi DITOLAK sebagai jangkar saran. Jangkar kini
 * diluruskan ke teks CV asli (alignSuggestionAnchors) alih-alih dibuang, dan
 * kutipan yang berasal dari presentationHints ikut diverifikasi ke rawText —
 * sebelumnya dipakai mentah, sehingga sebuah gap bisa memajang kutipan yang
 * tidak ada di dokumen aslinya.
 * v3.2.2: ekstraksi lowongan tidak lagi boleh membuang requirement. parseJob
 * dulu hanya dibekali satu kalimat instruksi, sehingga baris majemuk seperti
 * "terbiasa dengan automated testing (Jest, Vitest)" menyusut jadi nama alatnya
 * saja dan konsepnya lenyap. Yang hilang bukan sekadar satu gap: mustHaveSkills
 * adalah PENYEBUT skor kecocokan, jadi requirement yang lolos dari ekstraksi
 * menaikkan matchScore diam-diam sekaligus menghapus gap-nya dari laporan.
 * Sekarang cara meminta dan syarat penerimaannya tinggal berdampingan di
 * prompts/jobExtraction.ts, hasil parse disaring strictJobParsedSchema (satu
 * entri satu skill, tanpa kembar, bukan kalimat utuh), dan pesan penolakannya
 * ditulis sebagai instruksi sehingga repair loop generateStructured yang sudah
 * ada langsung memakainya tanpa mesin tambahan. parseJob juga turun ke
 * temperature 0 karena tugasnya menyalin, bukan mengarang.
 * v3.2.3: dua celah guardrail yang sama-sama lolos karena diukur dengan cara
 * yang salah. Pertama, addressesGap dulu string bebas: model menulis "OCR,
 * Enkripsi Data" sebagai satu teks, pemeriksa pengantaran mencarinya dengan
 * pencocokan longgar, menemukan kata "OCR" di dalamnya, lalu meloloskan seluruh
 * saran — klaim keduanya tidak pernah diuji. Sekarang bentuknya array dan
 * SETIAP elemen diperiksa sendiri; satu elemen yang tidak terantar membatalkan
 * seluruh saran, karena saran setengah benar lebih berbahaya daripada tidak ada
 * saran (pengguna menerapkannya utuh). Kedua, kutipan bukti dipilih berdasarkan
 * URUTAN, bukan kualitas: gap "Design System" memajang "Shadcn/ui" — sembilan
 * karakter, lolos ambang delapan dengan selisih satu — padahal ada kalimat
 * pengalaman "maintain 100+ reusable components" yang jauh lebih membuktikan.
 * Kekuatan kutipan kini diukur dalam jumlah kata, semua kandidat diadu, dan
 * petunjuk hasil kode menang saat seri. Teks prompt laporan juga dipindahkan ke
 * analysis/reportPrompt.ts supaya analysis/report.ts murni berisi pemeriksaan.
 */
export const ENGINE_VERSION = "3.2.3"

/**
 * Versi PROMPT — dipisah dari ENGINE_VERSION supaya eksperimen kalimat prompt
 * bisa menginvalidasi cache TANPA mengklaim perubahan arsitektur mesin.
 * WAJIB dinaikkan setiap kali isi prompt diubah, sekecil apa pun — termasuk
 * prompt ekstraksi CV/lowongan, bukan cuma prompt analisis, karena hasilnya
 * sama-sama mengubah laporan yang dilihat pengguna.
 */
export const PROMPT_VERSION = "p3.2.3-2026-08-06"

/** Kuota analisis default per bulan (null = unlimited). PRD §14. */
export const DEFAULT_ANALYSIS_QUOTA = 10

/** Semantik warna skor — Design System §Score. */
export function scoreTone(score: number): "red" | "yellow" | "green" {
  if (score < 50) return "red"
  if (score < 75) return "yellow"
  return "green"
}

/** Batas panjang input untuk kontrol biaya AI (karakter). */
export const MAX_CV_CHARS = 20_000
export const MAX_JOB_CHARS = 12_000

// ===== Live Mock Interview (PRD §7.7, M5) =====

/** Kuota sesi latihan interview default per bulan (null = unlimited). */
export const DEFAULT_INTERVIEW_QUOTA = 5

/** Model Gemini Live untuk percakapan suara realtime (referensi: Career-Vibe). */
export const INTERVIEW_LIVE_MODEL = "gemini-3.1-flash-live-preview"

/** Durasi maksimum satu sesi interview — hard cap biaya (detik). */
export const INTERVIEW_MAX_DURATION_SEC = 600

/**
 * Frasa penutup baku — persona diinstruksikan menutup sesi dengan kalimat yang
 * MENGANDUNG salah satu frasa ini, dan FE memakai frasa yang sama untuk auto-end.
 */
export const INTERVIEW_CLOSING_PHRASES = [
  "sesi interview kita selesai",
  "our interview session is complete",
] as const

export const INTERVIEW_PERSONAS = ["SANTAI", "NETRAL", "TEGAS", "MENEKAN"] as const
export type InterviewPersona = (typeof INTERVIEW_PERSONAS)[number]

export const INTERVIEW_PERSONA_LABELS: Record<
  InterviewPersona,
  { id: string; en: string; hint: { id: string; en: string }; emoji: string }
> = {
  SANTAI: {
    id: "Santai", en: "Casual", emoji: "😄",
    hint: { id: "Ngobrol hangat — cocok buat pemanasan", en: "Warm chat — good for warming up" },
  },
  NETRAL: {
    id: "Netral", en: "Neutral", emoji: "🙂",
    hint: { id: "HR profesional pada umumnya", en: "Typical professional HR" },
  },
  TEGAS: {
    id: "Tegas", en: "Strict", emoji: "🧐",
    hint: { id: "To the point, menggali detail jawaban", en: "To the point, digs into details" },
  },
  MENEKAN: {
    id: "Menekan", en: "Pressure", emoji: "🔥",
    hint: { id: "Menantang & menguji ketahanan argumen", en: "Challenging & stress-tests your answers" },
  },
}

export const INTERVIEW_STATUSES = ["CREATED", "LIVE", "ENDED", "FEEDBACK_READY"] as const
export type InterviewStatus = (typeof INTERVIEW_STATUSES)[number]

// ===== Cover Letter Generator (PRD Cover Letter §9.2) =====

/** Kuota gratis pembuatan surat lamaran default per bulan (null = unlimited). */
export const DEFAULT_COVER_LETTER_QUOTA = 3

export const COVER_LETTER_TEMPLATES = ["professional", "modern", "creative"] as const
export type CoverLetterTemplate = (typeof COVER_LETTER_TEMPLATES)[number]

export const COVER_LETTER_TEMPLATE_LABELS: Record<
  CoverLetterTemplate,
  { id: string; en: string; description: { id: string; en: string } }
> = {
  professional: {
    id: "Profesional",
    en: "Professional",
    description: {
      id: "Format bisnis klasik dengan nada formal, cocok untuk perusahaan korporasi",
      en: "Classic business layout with formal tone, suitable for corporate roles",
    },
  },
  modern: {
    id: "Modern",
    en: "Modern",
    description: {
      id: "Tampilan bersih & kontemporer dengan penekanan pada pencapaian utama",
      en: "Clean contemporary layout with emphasis on key achievements",
    },
  },
  creative: {
    id: "Kreatif",
    en: "Creative",
    description: {
      id: "Pendekatan bercerita (storytelling) dengan sentuhan estetika scrapbook",
      en: "Storytelling approach with scrapbook aesthetic touch",
    },
  },
}
