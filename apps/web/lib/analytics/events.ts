/**
 * Taksonomi event produk — satu-satunya daftar event yang boleh dikirim.
 *
 * ATURAN: JANGAN pernah mengirim data pribadi di properti event (nama, email,
 * isi CV, isi lowongan, nama perusahaan). Cukup bentuk dan hasilnya, bukan
 * isinya. Properti di bawah dirancang supaya melanggar aturan ini akan
 * langsung gagal di typecheck.
 */
export type AnalyticsEventMap = {
	/** Pendaftaran berhasil. */
	sign_up: { method: "email" | "google" | "github" }
	/** CV masuk ke sistem, lewat unggah berkas atau tempel teks. */
	cv_uploaded: { source: "upload" | "paste"; file_type?: "pdf" | "docx" | "text" }
	/** Analisis kecocokan selesai. `cached` membedakan hasil baru vs hasil ulang. */
	analysis_completed: { match_score: number; cached: boolean }
	/** Surat lamaran berhasil dibuat. */
	cover_letter_generated: {
		language: string
		tone: string
		length: string
	}
	/** Sesi mock interview berakhir. */
	interview_session_ended: { persona: string; duration_sec: number }
	/** Unduhan berkas hasil. */
	export_downloaded: {
		format: "txt" | "docx" | "pdf"
		module: "analysis" | "cover_letter" | "cv"
	}
	/** Pengguna menabrak batas kuota — sinyal utama kesiapan monetisasi. */
	quota_exceeded: { module: "analysis" | "interview" | "cover_letter" }
}

export type AnalyticsEventName = keyof AnalyticsEventMap
