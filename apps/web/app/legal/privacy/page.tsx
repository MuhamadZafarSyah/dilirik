import type { Metadata } from "next"
import Link from "next/link"

const title = "Kebijakan Privasi"
const description =
  "Data apa yang Dilirik simpan, untuk apa dipakai, bagaimana CV diproses model AI, retensi, dan keamanannya."

/**
 * Halaman legal tetap `index, follow` (K8): halaman ini memberi sinyal
 * kepercayaan ke Google dan sering dicari langsung oleh calon pengguna.
 */
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/legal/privacy" },
  openGraph: {
    title,
    description,
    url: "/legal/privacy",
  },
}

export default function PrivacyPage() {
  return (
    <main className="paper-texture min-h-screen">
      <div className="shell mx-auto max-w-3xl px-4 py-12">
        <Link href="/" className="hand text-3xl">Dilirik 👀</Link>
        <h1 className="hand mt-8 text-4xl">Kebijakan Privasi</h1>
        <div className="card bg-panel border-line mt-6 space-y-4 rounded-lg border-2 p-6 text-sm leading-relaxed">
          <p><strong>Data yang kami simpan:</strong> akun (nama, email), CV yang kamu tambahkan (teks + file asli), lowongan yang kamu tempel, hasil analisis, dan status lamaranmu.</p>
          <p><strong>Untuk apa:</strong> semata-mata untuk menjalankan fitur Dilirik — analisis kecocokan, riwayat versi CV, dan tracker lamaran. Kami tidak menjual datamu.</p>
          <p><strong>AI:</strong> teks CV dan lowongan dikirim ke penyedia model AI untuk dianalisis. Kami tidak mengizinkan penyedia melatih model dengan datamu.</p>
          <p><strong>Retensi:</strong> CV dan versi-versinya disimpan agar bisa dibandingkan, sampai kamu menghapusnya sendiri. Hapus akun = semua data ikut terhapus.</p>
          <p><strong>Keamanan:</strong> koneksi terenkripsi (TLS), password di-hash, akses data dibatasi per akun (ownership check di setiap permintaan).</p>
          <p><strong>Kontak:</strong> halo@dilirik.app</p>
        </div>
      </div>
    </main>
  )
}
