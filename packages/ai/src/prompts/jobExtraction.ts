import { jobParsedSchema } from "@dilirik/shared"
import type { z } from "zod"

/**
 * Kontrak ekstraksi lowongan — dua sisi dari satu perjanjian: CARA MEMINTA
 * (system prompt) dan APA YANG DITERIMA (schema ketat). Keduanya ditaruh
 * berdampingan supaya tidak bisa berubah sendiri-sendiri.
 *
 * Bug v3.2.1: "Automated Testing" tertulis jelas di lowongan tapi tidak pernah
 * sampai ke mustHaveSkills. Akibatnya bukan sekadar satu gap hilang.
 * mustHaveSkills adalah PENYEBUT skor kecocokan — setiap requirement yang lolos
 * dari ekstraksi menaikkan matchScore diam-diam sekaligus menghapus gap-nya dari
 * laporan. Kesalahan yang tidak kelihatan seperti ini harus dicegat di hulu.
 *
 * Kenapa schema ketatnya tidak ditanam di @dilirik/shared: jobParsedSchema di
 * sana juga dipakai MEMBACA parsedJson lama dari database. Menambah aturan ketat
 * di sana membuat baris lama gagal parse. Jadi longgar saat membaca, ketat saat
 * menulis.
 */

/**
 * System prompt ekstraksi.
 *
 * Nadanya sengaja "menyalin, bukan meringkas": model cenderung merapikan daftar
 * panjang, dan perapian itulah yang membuang requirement.
 */
export const JOB_EXTRACTION_SYSTEM_PROMPT = `Kamu mesin ekstraksi requirement lowongan kerja. Tugasmu MENYALIN, bukan meringkas.

## Kenapa kelengkapan itu wajib
Hasil ekstraksimu dipakai menghitung kecocokan CV. Satu requirement yang terlewat membuat skor pelamar naik palsu dan gap-nya tidak pernah muncul di laporan. Kelebihan satu entri masih bisa dinilai sendiri oleh pelamar; kekurangan satu entri hilang tanpa jejak. Jadi ekstraksi yang lengkap lebih penting daripada ekstraksi yang rapi.

## Cara kerja
1. Sisir teks BARIS PER BARIS. Jangan melompat, jangan menyimpulkan lebih dulu.
2. SATU baris bisa melahirkan BEBERAPA skill. Ambil semuanya.
3. KONSEP juga skill, bukan cuma nama produk. "automated testing", "responsive design", "state management", "code review", "unit testing", "REST API", "Agile/Scrum" wajib ikut terangkat.
4. DILARANG membuang entri karena terasa mirip, remeh, mendasar, atau sudah terwakili entri lain.
5. Satu entri = satu skill. Jangan menggabungkan dua skill dengan koma atau kata "dan".
6. Tulis bentuk kanoniknya dan buang kata pengisi: "pengalaman dengan React" jadi "React", "familiar with Jest" jadi "Jest".

## Wajib atau opsional
- mustHaveSkills: baris di bawah judul Requirements/Kualifikasi/Persyaratan, atau yang bertanda "wajib", "harus", "minimal", "required", "must have".
- niceToHaveSkills: yang bertanda "nilai tambah", "diutamakan", "menjadi plus", "nice to have", "preferred".
- Ragu? Masukkan ke mustHaveSkills.

## Yang BUKAN skill
Lama pengalaman, jenjang pendidikan, lokasi kerja, gaji, benefit, jam kerja, dan sifat pribadi BUKAN skill. Semua itu tetap disalin ke "requirements", tapi tidak boleh masuk mustHaveSkills atau niceToHaveSkills.

## Field lain
- requirements: salin verbatim setiap baris kualifikasi/persyaratan, apa adanya.
- keywords: istilah ATS penting yang muncul di teks, termasuk sinonim dan akronim.
- jobTitle, company, level: isi bila tertulis, null bila tidak.

## Contoh
Teks lowongan:
Kualifikasi:
- Minimal 3 tahun pengalaman sebagai Frontend Developer
- Menguasai React dan TypeScript
- Terbiasa dengan automated testing (Jest, Vitest) dan proses code review
- Pengalaman dengan Docker menjadi nilai tambah

Ekstraksi yang benar:
- mustHaveSkills: React, TypeScript, Automated Testing, Jest, Vitest, Code Review
- niceToHaveSkills: Docker
- requirements: keempat baris di atas, verbatim.

Perhatikan tiga hal. Baris ketiga menghasilkan EMPAT entri sekaligus. "Automated Testing" tetap diangkat walaupun Jest dan Vitest sudah disebut — konsep dan alatnya dihitung terpisah. Baris pertama TIDAK menghasilkan skill apa pun.`

/** Nama skill yang lebih panjang dari ini hampir pasti kalimat, bukan skill. */
const MAX_SKILL_CHARS = 60

const SKILL_LISTS = ["mustHaveSkills", "niceToHaveSkills"] as const
type SkillList = (typeof SKILL_LISTS)[number]

/** Potong nilai panjang supaya pesan perbaikan tetap enak dibaca. */
function preview(value: string, max = 48): string {
  return value.length <= max ? value : `${value.slice(0, max)}…`
}

function addIssue(
  ctx: z.RefinementCtx,
  path: Array<string | number>,
  message: string,
): void {
  ctx.addIssue({ code: "custom", path, message })
}

/**
 * Schema penerimaan hasil ekstraksi.
 *
 * Semua pesan penolakan ditulis sebagai INSTRUKSI PERBAIKAN, bukan keluhan.
 * Alasannya mekanis: generateStructured menyuapkan pesan issue Zod kembali ke
 * model sebagai repair hint, jadi kalimat di sini menjadi percobaan kedua model.
 * Karena itu pula aturannya sengaja hanya yang MURAH DIPENUHI — setiap penolakan
 * berarti satu panggilan LLM tambahan, dan tiga kali gagal berarti analisis
 * pengguna batal. Kelengkapan isi tetap urusan prompt; di sini hanya bentuk yang
 * dijaga, yaitu hal-hal yang kalau salah pasti merusak pencocokan skill.
 */
export const strictJobParsedSchema = jobParsedSchema.superRefine((job, ctx) => {
  /** skill (huruf kecil) → daftar tempat ia pertama kali muncul. */
  const seen = new Map<string, SkillList>()

  for (const list of SKILL_LISTS) {
    job[list].forEach((skill, index) => {
      const path = [list, index]
      const value = skill.trim()

      if (value.length === 0) {
        addIssue(ctx, path, `Ada entri kosong di ${list}. Hapus, atau isi dengan nama skill-nya.`)
        return
      }

      if (value.length > MAX_SKILL_CHARS) {
        addIssue(
          ctx,
          path,
          `"${preview(value)}" terlalu panjang (${value.length} karakter) untuk sebuah nama skill. Tulis skill-nya saja, mis. "Automated Testing". Kalimat utuh tempatnya di "requirements".`,
        )
        return
      }

      if (value.includes(",")) {
        addIssue(
          ctx,
          path,
          `"${value}" memuat lebih dari satu skill. Pecah jadi beberapa entri terpisah — satu entri, satu skill.`,
        )
        return
      }

      const firstSeenIn = seen.get(value.toLowerCase())
      if (firstSeenIn === undefined) {
        seen.set(value.toLowerCase(), list)
        return
      }

      addIssue(
        ctx,
        path,
        firstSeenIn === list
          ? `"${value}" ditulis dua kali di ${list}. Cukup sekali.`
          : `"${value}" muncul di mustHaveSkills sekaligus niceToHaveSkills. Sebuah skill hanya boleh wajib ATAU opsional — pilih salah satu.`,
      )
    })
  }

  if (job.requirements.length > 0 && job.mustHaveSkills.length === 0) {
    addIssue(
      ctx,
      ["mustHaveSkills"],
      `Ada ${job.requirements.length} baris requirement tapi mustHaveSkills kosong. Sisir ulang setiap baris dan angkat skill wajibnya.`,
    )
  }
})
