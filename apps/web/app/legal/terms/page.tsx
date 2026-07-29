import type { Metadata } from "next";
import Link from "next/link";
import { FiArrowLeft, FiFileText } from "react-icons/fi";
import { Card } from "@/components/ui/card";

const title = "Ketentuan Layanan";
const description =
  "Syarat dan ketentuan penggunaan layanan Dilirik, batasan kuota, kewajiban pengguna, dan disclaimer hasil analisis AI.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/legal/terms" },
  openGraph: {
    title,
    description,
    url: "/legal/terms",
  },
};

export default function TermsPage() {
  return (
    <main className="min-h-screen py-12 px-4 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Back Link */}
        <div>
          <Link
            href="/"
            className="group inline-flex items-center gap-2 text-muted hover:text-ink text-sm font-bold transition-colors"
          >
            <FiArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Kembali ke Beranda
          </Link>
        </div>

        {/* Header Block */}
        <div className="space-y-2">
          <span className="label bg-blue/20 border border-blue/60 text-ink px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 shadow-xs">
            <FiFileText className="text-blue h-3.5 w-3.5" /> Ketentuan Layanan
          </span>
          <h1 className="hand text-4xl sm:text-5xl font-extrabold text-ink tracking-tight">
            Ketentuan Layanan
          </h1>
          <p className="scrawl text-muted text-lg sm:text-xl">
            Terakhir diperbarui: 29 Juli 2026 · Waktu baca: 3 menit
          </p>
        </div>

        {/* Content Card */}
        <Card
          tape="blue"
          pin
          rotate={-0.5}
          className="w-full p-8 sm:p-12 space-y-8"
        >
          <div className="space-y-8 text-ink">
            {/* Section 1 */}
            <section className="space-y-3">
              <div className="flex items-center gap-2.5">
                <span className="hand text-2xl font-bold text-red bg-red/10 px-2 py-0.5 rounded-md">
                  01
                </span>
                <h2 className="hand text-2xl font-bold text-ink">
                  Penerimaan Layanan
                </h2>
              </div>
              <p className="text-sm sm:text-base leading-relaxed pl-10 text-ink/80">
                Dengan mendaftar, mengakses, atau menggunakan layanan{" "}
                <strong>Dilirik</strong>, Anda menyatakan bahwa Anda telah
                membaca, memahami, dan menyetujui seluruh ketentuan layanan ini.
                Jika Anda tidak menyetujui ketentuan ini, Anda tidak
                diperkenankan menggunakan layanan kami.
              </p>
            </section>

            {/* Divider */}
            <div className="border-t border-line/60 my-6" />

            {/* Section 2 */}
            <section className="space-y-3">
              <div className="flex items-center gap-2.5">
                <span className="hand text-2xl font-bold text-blue bg-blue/10 px-2 py-0.5 rounded-md">
                  02
                </span>
                <h2 className="hand text-2xl font-bold text-ink">
                  Akun dan Keamanan
                </h2>
              </div>
              <p className="text-sm sm:text-base leading-relaxed pl-10 text-ink/80">
                Anda bertanggung jawab penuh atas kerahasiaan password dan akun
                Anda, serta semua aktivitas yang terjadi di bawah akun Anda.
                Satu akun hanya boleh digunakan secara personal oleh pemilik
                akun yang bersangkutan. Pendaftaran akun secara otomatis oleh
                bot atau script sangat dilarang.
              </p>
            </section>

            {/* Divider */}
            <div className="border-t border-line/60 my-6" />

            {/* Section 3 */}
            <section className="space-y-3">
              <div className="flex items-center gap-2.5">
                <span className="hand text-2xl font-bold text-yellow bg-yellow/20 px-2 py-0.5 rounded-md">
                  03
                </span>
                <h2 className="hand text-2xl font-bold text-ink">
                  Penggunaan yang Sah
                </h2>
              </div>
              <p className="text-sm sm:text-base leading-relaxed pl-10 text-ink/80">
                Anda setuju untuk menggunakan Dilirik hanya untuk keperluan yang
                sah dan tidak melanggar hukum. Anda dilarang keras mencoba
                melakukan rekayasa balik (reverse engineering), scraping
                otomatis data massal, memotong (bypass) batasan kuota analisis,
                atau melakukan tindakan yang dapat mengganggu stabilitas
                infrastruktur kami.
              </p>
            </section>

            {/* Divider */}
            <div className="border-t border-line/60 my-6" />

            {/* Section 4 */}
            <section className="space-y-3">
              <div className="flex items-center gap-2.5">
                <span className="hand text-2xl font-bold text-green bg-green/10 px-2 py-0.5 rounded-md">
                  04
                </span>
                <h2 className="hand text-2xl font-bold text-ink">
                  Batasan Kuota dan Layanan
                </h2>
              </div>
              <p className="text-sm sm:text-base leading-relaxed pl-10 text-ink/80">
                Akun dengan paket gratis (Free) akan diberikan kuota analisis CV
                sebanyak 10 kali per periode. Dilirik berhak untuk menyesuaikan
                kuota ini, mengubah batasan layanan, atau menangguhkan akses
                akun yang terdeteksi melakukan penyalahgunaan atau kecurangan
                kuota.
              </p>
            </section>

            {/* Divider */}
            <div className="border-t border-line/60 my-6" />

            {/* Section 5 */}
            <section className="space-y-3">
              <div className="flex items-center gap-2.5">
                <span className="hand text-2xl font-bold text-red bg-red/10 px-2 py-0.5 rounded-md">
                  05
                </span>
                <h2 className="hand text-2xl font-bold text-ink">
                  Hak Milik Intelektual
                </h2>
              </div>
              <p className="text-sm sm:text-base leading-relaxed pl-10 text-ink/80">
                Seluruh dokumen CV dan detail deskripsi pekerjaan yang Anda
                unggah ke Dilirik tetap merupakan hak milik intelektual Anda
                sepenuhnya. Dilirik hanya memiliki hak terbatas untuk memproses
                data tersebut guna kepentingan menyajikan analisis kecocokan dan
                laporan kepada Anda.
              </p>
            </section>

            {/* Divider */}
            <div className="border-t border-line/60 my-6" />

            {/* Section 6 */}
            <section className="space-y-3">
              <div className="flex items-center gap-2.5">
                <span className="hand text-2xl font-bold text-blue bg-blue/10 px-2 py-0.5 rounded-md">
                  06
                </span>
                <h2 className="hand text-2xl font-bold text-ink">
                  Disclaimer Hasil AI
                </h2>
              </div>
              <p className="text-sm sm:text-base leading-relaxed pl-10 text-ink/80">
                Layanan analisis kecocokan CV pada Dilirik didukung oleh
                kecerdasan buatan (AI). Hasil analisis, skor kecocokan, saran
                optimasi, dan rekomendasi yang diberikan bersifat membantu
                referensi Anda dan disediakan "sebagaimana adanya". Dilirik
                tidak menjamin akurasi mutlak dari hasil pemrosesan AI, dan
                tidak menjamin kelulusan atau panggilan wawancara kerja Anda di
                perusahaan mana pun.
              </p>
            </section>

            {/* Divider */}
            <div className="border-t border-line/60 my-6" />

            {/* Section 7 */}
            <section className="space-y-3">
              <div className="flex items-center gap-2.5">
                <span className="hand text-2xl font-bold text-yellow bg-yellow/20 px-2 py-0.5 rounded-md">
                  07
                </span>
                <h2 className="hand text-2xl font-bold text-ink">
                  Kontak Kami
                </h2>
              </div>
              <p className="text-sm sm:text-base leading-relaxed pl-10 text-ink/80">
                Jika Anda memiliki pertanyaan mengenai Ketentuan Layanan ini,
                silakan hubungi tim dukungan kami melalui surel di:{" "}
                <a
                  href="mailto:support@dilirik.tech"
                  className="text-blue font-bold hover:underline"
                >
                  support@dilirik.tech
                </a>
              </p>
            </section>
          </div>
        </Card>
      </div>
    </main>
  );
}
