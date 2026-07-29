/**
 * Sumber tunggal FAQ: dipakai untuk akordeon di halaman dan untuk structured
 * data `FAQPage`. Kalau keduanya ditulis terpisah, isinya pasti berbeda suatu
 * hari, dan Google menandai ketidakcocokan itu sebagai data menyesatkan.
 */
export type FaqItem = {
	question: string
	answer: string
}

export const faqs: readonly FaqItem[] = [
	{
		question: "Apakah Dilirik gratis?",
		answer:
			"Selama masa beta, setiap akun mendapat 10 analisis kecocokan per bulan tanpa biaya dan tanpa kartu kredit. Menyimpan CV, lowongan, dan riwayat analisis tidak memotong kuota.",
	},
	{
		question: "Bagaimana Dilirik mencegah AI mengarang pengalaman?",
		answer:
			"Setiap saran revisi harus menyertakan bukti dari teks CV kamu. Saran yang buktinya tidak ditemukan akan dibuang sebelum sampai ke layar, dan jumlah yang dibuang ditampilkan apa adanya. Mekanisme ini mengurangi risiko karangan, jadi tetap periksa hasil akhirnya sebelum kamu kirim.",
	},
	{
		question: "Apakah hasilnya ramah sistem ATS?",
		answer:
			"Ekspor PDF memakai struktur teks bersih dan font standar tanpa elemen grafis yang membingungkan parser. Kalau kamu mengunggah DOCX, Dilirik merevisi berkas DOCX aslimu sehingga desain, font, dan tabelmu tetap utuh.",
	},
	{
		question: "Format dokumen apa yang bisa diunggah?",
		answer:
			"PDF, DOCX, atau tempel langsung teks CV kamu. Ketiganya masuk ke alur analisis yang sama.",
	},
	{
		question: "Apakah data CV saya dijual atau dipakai melatih model?",
		answer:
			"Tidak. Data tersimpan di database privat, akses dibatasi per akun, dan penyedia model AI tidak diizinkan memakai datamu untuk pelatihan. Rinciannya ada di Kebijakan Privasi.",
	},
]
