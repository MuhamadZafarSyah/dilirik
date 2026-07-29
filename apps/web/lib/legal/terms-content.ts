import { LEGAL_CONTACT_EMAIL } from "./meta"
import type { LegalArticle } from "./types"

/**
 * Isi ketentuan layanan.
 *
 * Ditulis sebagai bahasa biasa, bukan bahasa kontrak, karena pembacanya adalah
 * pencari kerja. Dua hal yang sengaja dinyatakan terang-terangan: Dilirik tidak
 * menjanjikan pekerjaan, dan hasil AI tetap harus kamu periksa sendiri sebelum
 * dikirim ke perusahaan.
 */
export const termsSummary =
	"Ketentuan pemakaian Dilirik: apa yang kami sediakan, apa yang kami harapkan darimu, dan apa yang tidak kami janjikan."

export const termsArticles: readonly LegalArticle[] = [
	{
		id: "tentang-layanan",
		title: "Tentang layanan ini",
		paragraphs: [
			"Dilirik adalah alat bantu untuk mencocokkan CV dengan lowongan kerja: memberi skor kecocokan, menunjukkan gap, menyarankan revisi teks, membuat surat lamaran, dan mencatat status lamaranmu.",
			"Dengan membuat akun atau memakai Dilirik, kamu setuju dengan ketentuan di halaman ini. Kalau ada bagian yang tidak kamu setujui, jangan memakai layanan ini.",
		],
	},
	{
		id: "akun",
		title: "Akun kamu",
		paragraphs: [
			"Satu orang satu akun, dengan email yang benar-benar bisa kamu akses. Kamu bertanggung jawab menjaga kerahasiaan kata sandi dan atas semua aktivitas yang terjadi di akunmu.",
			"Kamu harus berusia minimal 17 tahun, atau memakai Dilirik dengan izin orang tua atau wali.",
		],
	},
	{
		id: "kuota-dan-harga",
		title: "Kuota dan harga selama beta",
		paragraphs: [
			"Selama masa beta, setiap akun mendapat sejumlah kuota gratis per bulan untuk analisis, surat lamaran, dan sesi latihan wawancara. Jumlah kuota yang berlaku selalu bisa kamu lihat di halaman harga dan di dalam aplikasi.",
			"Kuota berjalan per periode bulanan dan tidak menumpuk ke bulan berikutnya. Kami bisa mengubah besaran kuota, dan kalau nanti ada paket berbayar, harganya diumumkan lebih dulu di halaman harga sebelum berlaku.",
		],
	},
	{
		id: "konten-kamu",
		title: "Dokumen yang kamu unggah tetap milikmu",
		paragraphs: [
			"CV, lowongan, dan tulisan yang kamu masukkan tetap milikmu. Kami tidak mengklaim kepemilikan apa pun atas isinya.",
			"Kamu memberi kami izin terbatas untuk menyimpan dan memproses dokumen itu sebatas yang diperlukan untuk menjalankan fitur yang kamu minta, termasuk mengirim teksnya ke penyedia model AI. Rinciannya ada di Kebijakan Privasi. Izin ini berakhir saat kamu menghapus dokumen atau akunmu.",
			"Pastikan kamu memang berhak mengunggah isi dokumen tersebut, termasuk ketika di dalamnya ada nama atau data orang lain.",
		],
	},
	{
		id: "batas-penggunaan",
		title: "Yang tidak boleh dilakukan",
		paragraphs: [
			"Jangan memakai Dilirik untuk membuat dokumen yang menyesatkan calon pemberi kerja, misalnya mengaku punya pengalaman atau kualifikasi yang tidak kamu miliki.",
			"Jangan mengunggah data orang lain tanpa izin, jangan mencoba menembus batas kuota atau sistem keamanan, jangan mengambil data layanan secara otomatis dalam jumlah besar, dan jangan membebani sistem di luar pemakaian normal.",
		],
	},
	{
		id: "sifat-hasil-ai",
		title: "Sifat hasil analisis dan AI",
		paragraphs: [
			"Skor kecocokan, gap, dan saran revisi adalah keluaran model bahasa. Semuanya bersifat masukan, bukan penilaian resmi dari perusahaan mana pun.",
			"Guardrail kejujuran kami dirancang untuk menolak saran yang tidak punya bukti di CV-mu. Mekanisme itu mengurangi risiko karangan, tapi tidak menghapusnya sepenuhnya. Periksa sendiri setiap kalimat sebelum kamu kirim ke perusahaan. Kamu yang bertanggung jawab atas isi akhir dokumen lamaranmu.",
			"Dilirik tidak menjanjikan panggilan wawancara, tawaran kerja, atau hasil tertentu.",
		],
	},
	{
		id: "ketersediaan",
		title: "Ketersediaan layanan",
		paragraphs: [
			"Dilirik masih dalam pengembangan aktif. Fitur bisa berubah, ditambah, atau dihentikan, dan sesekali layanan bisa tidak tersedia karena pemeliharaan atau gangguan di pihak penyedia infrastruktur dan model AI.",
			"Kami menyarankan kamu tetap menyimpan salinan CV asli di perangkatmu sendiri.",
		],
	},
	{
		id: "penghentian",
		title: "Penghentian akun",
		paragraphs: [
			"Kamu bisa berhenti dan menghapus akunmu kapan saja langsung dari aplikasi.",
			"Kami bisa menangguhkan atau menghentikan akun yang melanggar ketentuan di halaman ini, khususnya bagian batas penggunaan. Kalau memungkinkan, kami memberi tahu lebih dulu lewat email.",
		],
	},
	{
		id: "batas-tanggung-jawab",
		title: "Batas tanggung jawab",
		paragraphs: [
			"Layanan disediakan apa adanya. Sejauh diizinkan hukum yang berlaku, kami tidak bertanggung jawab atas kerugian tidak langsung yang timbul dari pemakaian layanan, termasuk kehilangan peluang kerja atau kehilangan data yang tidak kamu simpan salinannya.",
			"Ketentuan ini tidak mengurangi hak-hakmu sebagai konsumen yang dijamin peraturan perundang-undangan.",
		],
	},
	{
		id: "perubahan",
		title: "Perubahan ketentuan",
		paragraphs: [
			"Kalau ada perubahan yang berarti, kami memperbarui tanggal di bagian atas halaman ini dan memberi tahu lewat email atau pemberitahuan di dalam aplikasi. Melanjutkan pemakaian setelah perubahan berlaku berarti kamu menyetujui versi yang baru.",
		],
	},
	{
		id: "hukum",
		title: "Hukum yang berlaku",
		paragraphs: [
			"Ketentuan ini tunduk pada hukum Republik Indonesia. Perselisihan diupayakan selesai lewat musyawarah lebih dulu sebelum ditempuh jalur hukum.",
		],
	},
	{
		id: "kontak",
		title: "Kontak",
		paragraphs: [
			"Pertanyaan soal ketentuan ini bisa dikirim ke " + LEGAL_CONTACT_EMAIL + ".",
		],
	},
]
