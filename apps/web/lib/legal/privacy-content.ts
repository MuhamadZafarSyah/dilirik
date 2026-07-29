import { LEGAL_CONTACT_EMAIL } from "./meta"
import type { LegalArticle } from "./types"

/**
 * Isi kebijakan privasi.
 *
 * Kata-katanya dipertahankan apa adanya dari versi yang sudah tayang. Yang
 * berubah hanya strukturnya: label tebal di awal paragraf kini menjadi judul
 * pasal, sehingga tiap topik punya anchor sendiri dan bisa ditautkan langsung.
 */
export const privacySummary =
	"Ringkasnya: datamu dipakai hanya untuk menjalankan fitur Dilirik, tidak dijual, dan bisa kamu hapus sendiri kapan saja."

export const privacyArticles: readonly LegalArticle[] = [
	{
		id: "data-yang-disimpan",
		title: "Data yang kami simpan",
		paragraphs: [
			"Akun (nama, email), CV yang kamu tambahkan (teks + file asli), lowongan yang kamu tempel, hasil analisis, dan status lamaranmu.",
		],
	},
	{
		id: "untuk-apa",
		title: "Untuk apa data itu dipakai",
		paragraphs: [
			"Semata-mata untuk menjalankan fitur Dilirik: analisis kecocokan, riwayat versi CV, dan tracker lamaran. Kami tidak menjual datamu.",
		],
	},
	{
		id: "pemrosesan-ai",
		title: "Pemrosesan oleh model AI",
		paragraphs: [
			"Teks CV dan lowongan dikirim ke penyedia model AI untuk dianalisis. Kami tidak mengizinkan penyedia melatih model dengan datamu.",
		],
	},
	{
		id: "retensi",
		title: "Retensi dan penghapusan",
		paragraphs: [
			"CV dan versi-versinya disimpan agar bisa dibandingkan, sampai kamu menghapusnya sendiri. Hapus akun berarti semua data ikut terhapus.",
		],
	},
	{
		id: "keamanan",
		title: "Keamanan",
		paragraphs: [
			"Koneksi terenkripsi (TLS), password di-hash, dan akses data dibatasi per akun lewat pemeriksaan kepemilikan di setiap permintaan.",
		],
	},
	{
		id: "kontak",
		title: "Kontak",
		paragraphs: [
			"Pertanyaan soal data pribadimu bisa dikirim ke " + LEGAL_CONTACT_EMAIL + ".",
		],
	},
]
