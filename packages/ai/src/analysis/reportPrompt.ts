import type { SuggestionMode } from "@dilirik/shared"
import { HONESTY_SYSTEM_PROMPT, reportLanguageInstruction } from "../guardrail/systemPrompt"

/**
 * SELURUH teks yang diminta ke model untuk laporan analisis.
 *
 * Dipisah dari `analysis/report.ts` dengan alasan yang sama seperti pemisahan
 * `prompts/jobExtraction.ts` dari `prompts/parseJob.ts` di v3.2.2: satu berkas
 * mengurus CARA MEMINTA, berkas lain mengurus CARA MEMVERIFIKASI. Sebelumnya
 * keduanya berdesakan di satu berkas 700 baris, sehingga mengubah satu kalimat
 * prompt berarti menyentuh berkas yang juga memuat seluruh guardrail — mahal
 * untuk ditinjau dan gampang salah.
 */

/** Batas jumlah saran per mode DITEGAKKAN di kode; di sini hanya diumumkan. */
const MODE_INSTRUCTIONS: Record<SuggestionMode, string> = {
  optimize: `MODE SARAN: OPTIMIZE — CV sudah satu bidang dengan lowongan.
Perkuat bullet yang paling relevan: pakai istilah dari lowongan yang MEMANG didukung fakta CV, action verb, dan angka dampak yang SUDAH ada di CV. Maksimal 6 saran, urutkan dari yang paling berdampak.`,
  reframe: `MODE SARAN: REFRAME — CV cocok sebagian.
Prioritas: reposisi. Tulis ulang PROFILE/summary agar mengarah ke target lowongan, tonjolkan transferable skills yang menjawab requirement. JANGAN memoles bullet yang tidak relevan dengan lowongan ini. Maksimal 5 saran.`,
  honest_pivot: `MODE SARAN: HONEST PIVOT — bidang CV BERBEDA dengan bidang lowongan.
JANGAN memoles bullet yang tidak relevan — itu membuang waktu user dan menyesatkan. HANYA buat saran "jembatan": revisi yang menghubungkan fakta yang SUNGGUH ada di CV dengan requirement lowongan (mis. tools/AI/bahasa/lokasi yang kebetulan diminta), dan akui di kalimatnya bahwa jembatan itu parsial. Maksimal 3 saran. Jika tidak ada jembatan jujur, kembalikan suggestions: [] — ARRAY KOSONG ADALAH JAWABAN YANG BENAR. WAJIB isi careerNote dengan penjelasan jujur apa yang sebenarnya dibutuhkan lowongan ini (mis. portofolio karya, pengalaman nyata) — bukan basa-basi.`,
}

const FRAME = `Kamu menghasilkan SATU laporan utuh { gaps, suggestions, careerNote } — semuanya harus SATU pemikiran dan tidak boleh saling bertentangan: saran hanya boleh lahir dari gap yang bisa dijawab dengan revisi teks.`

const GAP_RULES = `ATURAN GAPS:
- severity: "must" jika dari requirement wajib lowongan, "nice" jika nice-to-have/plus point.
- fixability: "fixable_by_editing" HANYA jika faktanya sudah ada di CV dan tinggal disajikan; "requires_experience" jika jujur butuh pengalaman/belajar nyata (JANGAN beri advice template "ikut kursus" berulang — beri langkah spesifik & realistis, atau akui tidak bisa ditambal tulisan); "fit_constraint" untuk faktor non-skill (atribut personal, identitas, lokasi) — tulis netral & sensitif, TANPA menyarankan mengubah diri.
- HANYA gap ber-fixability "fixable_by_editing" yang boleh melahirkan suggestion.`

/**
 * Langkah CARI-BUKTI sebelum memvonis (engine v3.2).
 *
 * Kandidat gap datang dari pencocokan kata harfiah, dan kalimat "skill lowongan
 * yang tidak terdeteksi di CV" menanamkan premis yang cenderung dikonfirmasi
 * model. Instruksi ini dulu ada di analysis/gaps.ts — file yang ternyata TIDAK
 * PERNAH DIEKSEKUSI (pipeline hanya memanggil generateAnalysisReport), sehingga
 * model tidak pernah menerimanya. Sekarang ia hidup di jalur yang benar.
 */
const EVIDENCE_FIRST_RULES = `LANGKAH WAJIB SEBELUM MENYATAKAN SESUATU TIDAK ADA:
Kandidat gap di data bawah berasal dari pencocokan kata HARFIAH, jadi WAJAR kalau sebagian bukan kekurangan sungguhan. Kamu BOLEH dan HARUS menolak premisnya bila memang begitu — jangan memaksakan penjelasan untuk sesuatu yang sebenarnya sudah dikuasai kandidat.
Untuk SETIAP kandidat, kerjakan urutan ini sebelum memutuskan:
1. Sisir "experiences[].highlights" dan "achievements" satu per satu — bukan hanya daftar skills. Bagian inilah yang paling sering memuat faktanya.
2. Cari juga PADANANNYA, bukan cuma kata yang sama persis: nama tool, nama library, nama teknik, atau singkatannya. Lowongan menulis konsep ("OCR", "data visualization", "enkripsi data"), CV sering menulis implementasinya ("PaddleOCR", "ApexCharts", "AES-256-GCM"). Itu HAL YANG SAMA.
3. Tulis di field "searchedFor" istilah apa saja yang kamu cari di langkah 1-2. Field ini WAJIB terisi untuk setiap gap ber-type "real" dengan severity "must". Kalau kamu tidak bisa menyebut apa yang kamu cari, artinya kamu belum mencari.
4. Baru setelah itu tentukan type-nya.`

/**
 * Definisi gap PENYAJIAN + kewajiban mengutip (engine v3.2).
 *
 * Kewajiban mengutip inilah yang mematikan output isi-blanko: kalimat template
 * bisa dikarang tanpa membaca CV, tapi kutipan verbatim tidak — dan kutipan
 * palsu bisa dideteksi kode (lihat enforceGapEvidence).
 *
 * v3.2.3: ditambah permintaan mengutip KALIMAT PENGALAMAN, bukan satu entri di
 * daftar skill. Kutipan "Shadcn/ui" secara teknis benar tapi tidak membuktikan
 * apa pun tentang cara kandidat memakainya — dan itulah yang muncul di uji gold
 * set. Kode kini memilih kutipan terkuat, tapi memintanya di sini lebih murah
 * daripada memperbaikinya di hilir.
 */
const PRESENTATION_RULES = `TIGA TYPE GAP — BEDAKAN DENGAN TELITI:
- "presentation" = FAKTANYA ADA di CV, tapi tidak tersaji sebagai istilah yang dicari lowongan (terkubur di tengah kalimat panjang, atau ditulis sebagai nama tool sementara lowongan menyebut konsepnya). Inilah SATU-SATUNYA type yang bisa langsung diperbaiki dengan menyunting teks, jadi type inilah yang paling berharga untuk user. Cari type ini lebih dulu dan lebih keras daripada dua lainnya.
- "real" = benar-benar tidak ada jejaknya, sekecil apa pun, setelah kamu menjalankan langkah cari-bukti di atas.
- "implied" = sudah dipastikan dikuasai lewat skill lain. Jangan dipakai; daftar impliedCovered sudah ditangani sistem.

UNTUK SETIAP GAP "presentation" WAJIB:
- evidenceQuote = kutipan VERBATIM dari "Teks CV asli", persis karakter demi karakter, yang membuktikan faktanya memang ada. Sistem memverifikasi kutipan ini ke teks CV; kutipan yang tidak ditemukan membuat gap-mu dibatalkan.
- Pilih kutipan yang MENUNJUKKAN PEMAKAIAN, yaitu kalimat pengalaman/pencapaian yang memuat istilah itu. Satu entri dari daftar skill (mis. hanya "Shadcn/ui") adalah kutipan terlemah — pakai hanya kalau memang tidak ada kalimat lain yang memuatnya.
- fixability = "fixable_by_editing".
- explanation = sebutkan apa yang SUDAH ADA lalu jelaskan kenapa recruiter/ATS tetap bisa melewatkannya. Jangan berkata seolah kandidat tidak punya kemampuan itu.
- advice = perintah menyunting yang konkret: kata apa yang ditambahkan, di baris yang mana.

DILARANG menulis kalimat cetakan seperti "tidak ada pengalaman atau pengetahuan tentang X di CV" atau "perlu menambahkan pengalaman atau pengetahuan tentang X". Kalimat begitu bisa ditulis tanpa membaca CV sama sekali — itu sebabnya dilarang, dan sistem akan menimpanya.`

/**
 * Aturan implikasi skill — sengaja ditulis TEGAS dan dengan contoh konkret.
 *
 * Kalimat larangan abstrak terbukti tidak cukup: engine v3 sudah punya
 * HONESTY_SYSTEM_PROMPT dan model tetap memvonis "tidak ada bukti pengalaman
 * HTML" untuk CV yang penuh React dan SvelteKit.
 */
const IMPLICATION_RULES = `ATURAN IMPLIKASI SKILL (WAJIB, PALING SERING DILANGGAR):
Daftar "impliedCovered" di data bawah berisi skill yang SUDAH DIPASTIKAN dikuasai kandidat — disimpulkan dari skill lain yang memang ada di CV-nya. Contoh: orang yang membangun aplikasi React, Vue, atau SvelteKit PASTI menguasai HTML dan CSS, walaupun kata "HTML" tidak pernah muncul satu kali pun di CV.
- DILARANG KERAS menuliskannya sebagai gap dalam bentuk apa pun, termasuk sebagai "presentation".
- DILARANG menulis explanation seperti "tidak ada bukti pengalaman HTML di CV" atau advice seperti "perlu menambahkan pengalaman atau pengetahuan tentang HTML". Kalimat semacam itu SALAH SECARA FAKTUAL dan menghina kandidat yang sudah bertahun-tahun membangun antarmuka.
- Sistem membuang gap semacam ini secara otomatis, dan setiap saran yang menggantung padanya ikut hangus. Jadi menulisnya hanya membuang jatah saranmu.
- Soal kata kunci ATS untuk skill ini sudah ditangani bagian lain di luar laporanmu. Abaikan sepenuhnya.`

const AFTER_RULES = `LANGKAH WAJIB SEBELUM MENULIS SETIAP \`after\`:
1. Cari ke SELURUH teks CV apakah ada ANGKA yang berhubungan dengan bullet ini (jumlah orang, durasi, frekuensi, persentase, nominal, jumlah proyek). Angka yang sudah ada tapi tercecer di bagian lain CV BOLEH dipindahkan ke bullet ini.
2. Kalau tidak ada satu pun angka, cari CAKUPAN konkret (berapa banyak, untuk siapa, seberapa sering, dengan tools apa) yang sudah tertulis di CV.
3. Kalau dua-duanya tidak ada, JANGAN mengarang angka. Lebih baik saran ini tidak dibuat.`

/**
 * v3.2.3: addressesGap berubah jadi ARRAY.
 *
 * Sebelumnya string bebas, dan model memanfaatkannya persis seperti yang bisa
 * ditebak: menulis "OCR, Enkripsi Data" sebagai satu teks, lalu lolos karena
 * pemeriksa hanya menemukan kata "OCR" di dalamnya. Satu klaim terbukti, satu
 * klaim menumpang gratis.
 *
 * v3.3.0: ditambah larangan menempelkan istilah dalam kurung. Begitu
 * pengantaran kata kunci diwajibkan, model menemukan jalan termurah untuk
 * mematuhinya — "...via PaddleOCR (OCR)" — yang lolos pemeriksaan tapi
 * menghasilkan kalimat CV yang canggung. Setiap guardrail baru melahirkan jalan
 * pintas baru; yang ini menutupnya di prompt sekaligus di kode.
 */
const SUGGESTION_RULES = `ATURAN SUGGESTIONS:
- before = KUTIPAN VERBATIM dari "Teks CV asli" — persis karakter demi karakter (tanda baca & kapitalisasi). Sistem MENOLAK otomatis saran yang \`before\`-nya tidak ditemukan verbatim.
- basedOnFacts = kutipan VERBATIM potongan teks CV (bukan parafrase seperti "team collaboration" — kutip "with the team").
- targetRequirement = kutip requirement lowongan yang dijawab saran ini. Saran tanpa target akan DIBUANG.
- addressesGap = ARRAY nama gap. Setiap elemen harus SAMA PERSIS dengan \`skill\` salah satu gap yang kamu tulis sendiri di atas. SATU ELEMEN SATU GAP — dilarang menggabungkan dua nama dalam satu teks dipisah koma seperti "OCR, Enkripsi Data"; tulis ["OCR", "Enkripsi Data"].
- Kata kunci SETIAP elemen addressesGap WAJIB benar-benar muncul di \`after\`. Sistem memeriksanya satu per satu: SATU elemen yang tidak terantar membatalkan SELURUH saran. Kalau kamu hanya yakin bisa mengantar satu gap, cantumkan satu saja — daftar yang panjang tidak menambah nilai, hanya menambah risiko.
- Cara mengantarkannya harus NATURAL, menyatu dengan kalimatnya. DILARANG menempelkan istilah dalam kurung sebagai satu-satunya perubahan, mis. mengubah "document capture via PaddleOCR" jadi "document capture via PaddleOCR (OCR)". Yang benar: tulis ulang jadi "OCR-based document capture via PaddleOCR". Sistem menolak saran yang SELURUH perubahannya cuma sisipan dalam kurung. Kurung yang memuat ANGKA tetap boleh (mis. "(3 posting/minggu)") — itu menambah informasi, bukan menempelkan kata kunci.
- whatChanged = klaim perubahan yang bisa DIBUKTIKAN dari teksmu sendiri. Sistem memverifikasi: "added_metric" wajib memunculkan angka baru di \`after\`; "added_tool" wajib memunculkan istilah lowongan yang benar-benar bertambah. Klaim palsu = saran DIBUANG.
- rationale = 1 kalimat: kenapa perubahan ini menaikkan peluang untuk lowongan INI.
- impact = "high" hanya untuk saran yang menjawab requirement WAJIB yang sedang lemah.
- DILARANG kata sifat memuji diri: "highly skilled", "expert in", "strong background", "showcasing expertise", "pekerja keras", "sangat ahli", dsb — divalidasi otomatis dan langsung ditolak. Termasuk kata pengisi seperti "seamless", "cutting-edge", "state-of-the-art".
- Pertahankan present tense untuk pekerjaan yang masih berjalan (mis. "May 2025 - Present").
- Dua saran DILARANG memakai potongan \`before\` yang sama atau saling tumpang tindih.
- Kualitas > kuantitas: suggestions [] adalah output valid jika tidak ada saran yang jujur DAN relevan.`

const CAREER_NOTE_RULES = `ATURAN CAREERNOTE: 1-3 kalimat, nada teman yang peduli dan jujur. Wajib terisi di mode reframe/honest_pivot (jelaskan posisi kandidat terhadap lowongan ini apa adanya). Boleh string kosong "" di mode optimize jika tidak ada catatan penting.`

/**
 * Few-shot — contoh benar + mode gagal yang paling sering muncul.
 * Contoh konkret jauh lebih efektif daripada menambah kalimat larangan.
 */
const FEW_SHOT = `## CONTOH (pelajari polanya, jangan disalin isinya)

### CONTOH BAIK 1 — SARAN YANG BERGUNA
Fakta CV: "Mengelola akun Instagram organisasi kampus, follower naik dari 800 ke 2.400 dalam 6 bulan"
Requirement lowongan: "Mampu menyusun konten media sosial dan membaca performa konten"
{
  "section": "experience",
  "before": "Mengelola akun Instagram organisasi kampus, follower naik dari 800 ke 2.400 dalam 6 bulan",
  "after": "Mengelola akun Instagram organisasi kampus (3 posting/minggu): follower naik 800 → 2.400 dalam 6 bulan, dengan evaluasi performa konten mingguan",
  "basedOnFacts": ["follower naik dari 800 ke 2.400 dalam 6 bulan"],
  "targetRequirement": "menyusun konten media sosial dan membaca performa konten",
  "addressesGap": ["Analisis performa konten"],
  "whatChanged": ["added_scope", "added_outcome"],
  "rationale": "Angka pertumbuhan sudah ada di CV tapi tenggelam; kadensi & evaluasi mingguan menjawab requirement secara eksplisit.",
  "impact": "high"
}

### CONTOH BAIK 2 — GAP PENYAJIAN (INI YANG PALING SERING TERLEWAT)
Requirement lowongan: "OCR" (wajib)
Fakta CV: "Developed the frontend of the Persuratan TNI-AD correspondence management system using SvelteKit and Svelte 5, covering 21 pages and 60+ components, with hardware and camera document capture via PaddleOCR, canvas-based digital signatures, and AES-256-GCM secured sessions with role-based access"
Kata "OCR" tidak berdiri sendiri di CV, tapi "PaddleOCR" ADALAH mesin OCR. Kandidat sudah membangun alur tangkap dokumen dengannya. Menyebut ini "tidak ada pengalaman OCR" adalah SALAH SECARA FAKTUAL. Perhatikan kutipannya: yang dipakai adalah KALIMAT PENGALAMAN, bukan satu entri daftar skill.
{
  "type": "presentation",
  "skill": "OCR",
  "severity": "must",
  "fixability": "fixable_by_editing",
  "searchedFor": ["OCR", "PaddleOCR", "Tesseract", "document capture", "ekstraksi teks"],
  "evidenceQuote": "hardware and camera document capture via PaddleOCR",
  "explanation": "Pengalaman OCR-nya sudah ada — alur tangkap dokumen lewat kamera memakai PaddleOCR. Masalahnya kata \\"OCR\\" tidak pernah berdiri sendiri di CV, jadi filter ATS yang mencocokkan istilah secara harfiah bisa melewatkannya.",
  "advice": "Sebut \\"OCR\\" secara eksplisit di baris itu, mis. \\"OCR-based document capture via PaddleOCR\\", dan tambahkan OCR ke daftar skill. Tidak ada fakta baru yang dikarang — hanya menamai yang sudah dikerjakan."
}

### CONTOH BURUK 1 — KOSMETIK (parafrase tanpa informasi baru)
"before": "Membantu tim marketing membuat konten"
"after": "Berkontribusi aktif membantu tim marketing dalam pembuatan konten"
SALAH: tidak ada informasi baru, cuma kata hiasan. Recruiter tidak mendapat apa pun. JANGAN kirim saran seperti ini — lebih baik tidak ada saran.

### CONTOH BURUK 2 — KEYWORD STUFFING
"after": "Membuat konten menggunakan SEO, SEM, Google Ads, Meta Ads, dan CRM untuk tim marketing"
SALAH: menempelkan istilah lowongan yang TIDAK ADA buktinya di CV. Ini berbohong, dan akan hancur di interview.

### CONTOH BURUK 3 — MEMUJI DIRI
"after": "Highly skilled content creator dengan strong background di digital marketing"
SALAH: kata sifat memuji diri tidak bisa diverifikasi, tidak dibaca ATS, dan otomatis DITOLAK sistem.

### CONTOH BURUK 4 — GAP YANG SEBENARNYA SUDAH TERCAKUP
CV: "Membangun frontend platform back-office dengan Nuxt 3, Vue 3, dan TypeScript (13 modul, 170+ komponen)"
Lowongan: "Menguasai HTML, CSS, JavaScript"
{ "type": "real", "skill": "HTML", "explanation": "Tidak ada bukti pengalaman HTML di CV", "advice": "Perlu menambahkan pengalaman HTML" }
SALAH TOTAL: mustahil membangun 170+ komponen Vue tanpa HTML. Gap ini tidak boleh ada. Sistem membuangnya otomatis.

### CONTOH BURUK 5 — SARAN YANG TIDAK MENGANTAR GAP-NYA
"addressesGap": ["OCR"]
"before": "... document capture via PaddleOCR, canvas-based digital signatures ..."
"after": "... document capture via PaddleOCR, canvas-based digital signatures ..., integrating REST APIs for seamless data flow"
SALAH: mengaku menjawab gap OCR, tapi kata "OCR" tetap tidak muncul di hasil akhirnya — yang ditambah justru REST API yang sudah tercatat cocok. Sistem menolak saran seperti ini secara otomatis.

### CONTOH BURUK 6 — KLAIM GAP BORONGAN
"addressesGap": ["OCR, Enkripsi Data"]
SALAH BENTUK: itu SATU elemen berisi dua nama gap. Sistem memperlakukannya sebagai satu nama gap yang tidak dikenal. Tulis ["OCR", "Enkripsi Data"], dan pastikan KEDUANYA benar-benar muncul di \`after\` — kalau tidak, seluruh saran dibuang.

### CONTOH BURUK 7 — MENEMPELKAN KATA KUNCI DALAM KURUNG
"addressesGap": ["OCR"]
"before": "... hardware and camera document capture via PaddleOCR ..."
"after": "... hardware and camera document capture via PaddleOCR (OCR) ..."
SALAH: kata "OCR" memang jadi muncul, tapi kalimatnya tidak jadi lebih baik — terbaca seperti menyogok filter ATS, dan itu keyword stuffing yang dilarang aturan #4. Yang benar: "... hardware and camera OCR document capture via PaddleOCR ...". Sistem menolak saran yang seluruh perubahannya cuma sisipan dalam kurung.`

/**
 * Rakit system prompt laporan.
 *
 * Urutannya disengaja: kejujuran → bahasa → bingkai keluaran → aturan diagnosis
 * → aturan resep → mode → contoh. Contoh diletakkan PALING AKHIR supaya ia
 * membaca sebagai penerapan dari aturan di atasnya, bukan sebagai aturan baru.
 *
 * v3.3.0: bahasa laporan dan bahasa CV masuk terpisah. Keduanya dulu satu
 * parameter, sehingga CV berbahasa Inggris otomatis menghasilkan laporan
 * berbahasa Inggris untuk pengguna Indonesia.
 */
export function buildReportSystemPrompt(args: {
  reportLanguage: string
  cvLanguage: string
  mode: SuggestionMode
}): string {
  return [
    HONESTY_SYSTEM_PROMPT,
    reportLanguageInstruction({
      reportLanguage: args.reportLanguage,
      cvLanguage: args.cvLanguage,
    }),
    FRAME,
    GAP_RULES,
    EVIDENCE_FIRST_RULES,
    PRESENTATION_RULES,
    IMPLICATION_RULES,
    AFTER_RULES,
    SUGGESTION_RULES,
    CAREER_NOTE_RULES,
    MODE_INSTRUCTIONS[args.mode],
    FEW_SHOT,
  ].join("\n\n")
}
