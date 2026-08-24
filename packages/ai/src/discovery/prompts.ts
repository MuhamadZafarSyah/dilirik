import { HONESTY_SYSTEM_PROMPT, languageInstruction } from "../guardrail/systemPrompt.js"

/**
 * Prompt fitur Cari Lowongan (PRD §11).
 *
 * Dua prompt, dua peran yang tidak boleh dicampur:
 * 1. Profil pencarian — MENGEKSTRAK apa yang sudah ada di CV. Tidak menyarankan
 *    karier baru, tidak menambah skill yang tidak tertulis.
 * 2. Kurasi — MEMILIH 5 lowongan dari 20 kandidat dan menjelaskan alasannya.
 *    Tidak mengarang detail lowongan, tidak menjanjikan diterima.
 *
 * Keduanya mewarisi HONESTY_SYSTEM_PROMPT yang sama dengan fitur analisis: kalau
 * bukti tidak ada di CV atau di ringkasan lowongan, tidak boleh disebut.
 */

export const SEARCH_PROFILE_SYSTEM = `${HONESTY_SYSTEM_PROMPT}

Tugasmu: menyusun PROFIL PENCARIAN KERJA dari sebuah CV.

Aturan:
- Ambil hanya dari isi CV. Jangan menebak industri, kota, atau skill yang tidak tertulis.
- roles: 2-5 judul posisi yang REALISTIS dilamar orang ini sekarang, pakai istilah yang benar-benar dipakai di lowongan (mis. "Frontend Developer", bukan "Pejuang Kode").
- skills: maksimal 10 skill teknis/tools yang tertulis di CV, huruf kecil.
- locations: kota yang tertulis di CV. Kalau CV tidak menyebut kota mana pun, kembalikan array kosong — JANGAN mengisi "Jakarta" sebagai tebakan.
- seniority: entry (0-2 th), mid (2-5 th), senior (5-8 th), lead (>8 th atau pernah memimpin tim).
- yearsExp: total tahun pengalaman kerja relevan; null bila tidak bisa dihitung.
- remotePref: "any" kecuali CV jelas menyatakan preferensi.
- Jangan menaikkan level. Fresh graduate tetap entry meskipun banyak proyek pribadi.`

export function buildSearchProfilePrompt(input: {
  cvJson: string
  language?: string
}): string {
  return `${languageInstruction(input.language ?? "id")}

CV (JSON):
${input.cvJson}

Susun profil pencarian kerja untuk CV di atas.`
}

export const CURATION_SYSTEM = `${HONESTY_SYSTEM_PROMPT}

Tugasmu: dari daftar kandidat lowongan bernomor, PILIH 5 yang paling layak dicoba
lamar oleh pemilik profil, lalu jelaskan alasannya secara jujur.

Aturan keras:
- Pilih TEPAT 5 kandidat bila tersedia. Jangan mengulang candidateIndex yang sama.
- Hanya gunakan candidateIndex yang ada di daftar. Jangan mengarang lowongan baru.
- reasonText: 1-2 kalimat, maksimal 220 karakter, menyebut kecocokan KONKRET yang
  terlihat di profil DAN di ringkasan lowongan (mis. skill yang sama, level yang pas,
  kota yang cocok). Jangan memakai kalimat pujian umum.
- cautionText: sebutkan SATU hal yang perlu diwaspadai bila memang ada — skill yang
  belum dimiliki, level yang lebih tinggi, lokasi berbeda, atau lowongan sudah lama
  diposting. Kalau tidak ada, isi null. Jangan mengarang risiko.
- JANGAN menjanjikan diterima, dipanggil interview, atau peluang dalam persen.
- JANGAN menyebut gaji yang tidak tertulis di ringkasan lowongan.
- note: satu kalimat opsional bila seluruh daftar kandidat memang lemah, supaya user
  tahu apa adanya. Kalau kandidatnya wajar, isi null.
- Urutkan hasil dari yang paling layak dicoba.`

export function buildCurationPrompt(input: {
  profileSummary: string
  candidatesText: string
  language?: string
}): string {
  return `${languageInstruction(input.language ?? "id")}

PROFIL PENCARI KERJA:
${input.profileSummary}

KANDIDAT LOWONGAN:
${input.candidatesText}

Pilih 5 kandidat terbaik dari daftar di atas.`
}
