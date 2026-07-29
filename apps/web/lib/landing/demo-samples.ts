/**
 * Data contoh untuk peraga di landing page.
 *
 * Ini DATA CONTOH, bukan data pengguna nyata, dan halaman wajib menyebutkannya
 * secara eksplisit di antarmuka. Angka di sini dipilih agar realistis, tetapi
 * tidak boleh dipakai sebagai klaim performa produk.
 */
export type DemoSample = {
	id: string
	role: string
	company: string
	score: number
	matchSkills: readonly string[]
	realGap: string
	presentationGap: string
	beforeText: string
	afterText: string
}

export const demoSamples: readonly DemoSample[] = [
	{
		id: "frontend",
		role: "Frontend Engineer",
		company: "perusahaan fintech",
		score: 88,
		matchSkills: ["Next.js", "TypeScript", "Tailwind CSS", "React"],
		realGap:
			"Lowongan meminta GraphQL dan micro-frontend, dan keduanya tidak ada di CV.",
		presentationGap:
			"Optimasi Core Web Vitals sudah pernah kamu kerjakan, tapi tertulis di halaman dua.",
		beforeText: "Meningkatkan kecepatan loading halaman aplikasi web frontend.",
		afterText:
			"Meningkatkan kecepatan loading aplikasi web dengan optimasi Core Web Vitals (LCP di bawah 1,2 detik) memakai Next.js SSR.",
	},
	{
		id: "pm",
		role: "Product Manager",
		company: "marketplace",
		score: 76,
		matchSkills: ["Product Roadmap", "User Research", "A/B Testing", "Scrum"],
		realGap:
			"Pengalaman mengelola anggaran pemasaran diminta, dan belum ada di CV.",
		presentationGap:
			"Hasil A/B testing kamu tertulis tanpa angka, padahal angkanya ada di catatanmu.",
		beforeText:
			"Memimpin proyek A/B testing untuk meningkatkan konversi pengguna.",
		afterText:
			"Memimpin A/B testing alur checkout yang menaikkan conversion rate 24 persen dalam tiga bulan.",
	},
	{
		id: "backend",
		role: "Backend Developer",
		company: "perusahaan travel",
		score: 92,
		matchSkills: ["Node.js", "PostgreSQL", "Redis", "Docker", "Prisma"],
		realGap:
			"Sertifikasi cloud bukan syarat wajib, tapi disebut sebagai nilai tambah.",
		presentationGap:
			"Kerja caching Redis kamu belum menyebutkan dampaknya ke latensi.",
		beforeText:
			"Mengimplementasikan Redis caching pada API pencarian penerbangan.",
		afterText:
			"Mengimplementasikan Redis caching pada query pencarian penerbangan, menurunkan p99 latency dari 450 ms ke 60 ms.",
	},
	{
		id: "data",
		role: "Data Analyst",
		company: "e-commerce",
		score: 84,
		matchSkills: ["Python", "SQL", "Tableau", "BigQuery"],
		realGap: "Apache Spark diminta di lowongan, dan belum ada di riwayat proyek.",
		presentationGap:
			"Dashboard yang kamu bangun ditulis sebagai tugas rutin, bukan sebagai pencapaian.",
		beforeText:
			"Membuat dashboard laporan penjualan rutin untuk tim manajemen.",
		afterText:
			"Merancang dashboard otomatis Tableau dan BigQuery yang memotong 15 jam kerja pelaporan mingguan.",
	},
]
