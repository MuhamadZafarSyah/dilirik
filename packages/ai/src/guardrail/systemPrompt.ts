/**
 * Guardrail titik-1: system prompt anti-mengarang (PRD §8).
 * Dipakai oleh SEMUA panggilan AI yang menyentuh CV/saran.
 */
export const HONESTY_SYSTEM_PROMPT = `Kamu adalah asisten karier yang JUJUR MUTLAK.
ATURAN KERAS (tidak boleh dilanggar):
1. DILARANG menambahkan, mengarang, atau melebih-lebihkan skill, pengalaman, gelar, angka, atau pencapaian yang TIDAK ADA di data CV yang diberikan.
2. Semua saran tulis ulang HANYA boleh menyajikan ulang fakta yang sudah ada agar lebih jelas dan menonjol.
3. Jika sebuah skill diminta lowongan tapi tidak ada di CV, itu adalah GAP — katakan jujur, jangan ditutupi.
4. Jangan pernah menyarankan berbohong, keyword stuffing, atau memalsukan apapun.
5. Jawab dalam bahasa yang diminta.`

/**
 * Instruksi bahasa untuk panggilan AI yang keluarannya SATU bahasa saja
 * (mis. semanticScore). Sengaja dibiarkan apa adanya — pemanggilnya tidak
 * pernah menghasilkan teks yang ditempelkan kembali ke CV, jadi tidak punya
 * masalah dua bahasa.
 */
export function languageInstruction(language: string): string {
  return language === "en"
    ? "Write ALL user-facing output in English (the CV is in English)."
    : `Tulis SEMUA output untuk pengguna dalam bahasa dengan kode "${language}" (bahasa CV).`
}

const LANGUAGE_LABELS: Record<string, string> = {
  id: "bahasa Indonesia",
  en: "bahasa Inggris",
}

/** "en-US" → "en", supaya "en" dan "en-US" tidak dianggap dua bahasa berbeda. */
function baseTag(language: string): string {
  return language.trim().toLowerCase().split("-")[0] ?? ""
}

/**
 * Instruksi bahasa untuk LAPORAN ANALISIS (engine v3.3) — kasusnya berbeda dari
 * `languageInstruction` karena satu keluaran memuat DUA bahasa sekaligus.
 *
 * Penjelasan, saran, dan careerNote ditulis dalam bahasa yang dipilih pengguna
 * di antarmuka. Tapi `before`, `after`, `basedOnFacts`, dan `evidenceQuote`
 * HARUS tetap dalam bahasa CV: tiga di antaranya kutipan verbatim yang
 * diverifikasi kode ke teks asli, dan `after` akan ditempelkan kembali ke
 * dokumen pengguna. Menerjemahkan `after` berarti menyisipkan satu bullet
 * berbahasa Indonesia ke tengah CV berbahasa Inggris — sekaligus membuat
 * `postCheckAnchor` gagal mencocokkan jangkarnya.
 *
 * Kalimat kedua hanya dikirim saat kedua bahasa memang berbeda. Kalau sama,
 * peringatan itu cuma menambah token dan mengundang model bingung sendiri.
 */
export function reportLanguageInstruction(args: {
  reportLanguage: string
  cvLanguage: string
}): string {
  const label =
    LANGUAGE_LABELS[baseTag(args.reportLanguage)] ??
    `bahasa dengan kode "${args.reportLanguage}"`

  const lines = [
    `BAHASA PENJELASAN: tulis SEMUA kalimat yang kamu susun sendiri untuk pengguna dalam ${label} — yaitu field "explanation", "advice", "rationale", dan "careerNote".`,
  ]

  if (baseTag(args.cvLanguage) !== baseTag(args.reportLanguage)) {
    lines.push(
      `BAHASA KUTIPAN: CV ini ditulis dalam bahasa lain (kode "${args.cvLanguage}"). JANGAN menerjemahkannya. Field "before", "after", "basedOnFacts", dan "evidenceQuote" WAJIB tetap memakai bahasa CV. Tiga yang pertama adalah kutipan verbatim yang dicocokkan sistem ke teks asli, dan "after" akan ditempelkan kembali ke dokumen — CV berbahasa Inggris harus tetap berbahasa Inggris setelah direvisi. "targetRequirement" dikutip apa adanya dari teks lowongan. Nama teknologi, isi "skill", dan isi "searchedFor" juga tidak diterjemahkan.`,
    )
  }

  return lines.join("\n")
}
