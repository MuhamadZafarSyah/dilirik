/**
 * Bento fitur. Lima isi, lima sel: satu sel lebar untuk fitur inti, lalu empat
 * sel pendukung dengan ritme dua dan dua. Tidak ada sel kosong sebagai pengisi.
 */
const features = [
  {
    title: "Guardrail kejujuran",
    body: "Saran revisi harus membawa bukti dari CV kamu. Yang tidak terbukti dibuang, dan jumlahnya ditampilkan apa adanya.",
    wide: true,
  },
  {
    title: "Revisi DOCX tanpa merusak desain",
    body: "Berkas Word aslimu yang direvisi, jadi font, tabel, dan tata letaknya tetap utuh.",
    wide: false,
  },
  {
    title: "Ekspor ramah ATS",
    body: "PDF dengan struktur teks bersih yang mudah dibaca mesin penyaring lamaran.",
    wide: false,
  },
  {
    title: "Surat lamaran berbasis CV",
    body: "Dibuat dari pengalaman yang benar-benar ada, bisa diunduh sebagai teks, DOCX, atau PDF.",
    wide: false,
  },
  {
    title: "Pelacak lamaran",
    body: "Semua lowongan yang kamu lamar dalam satu papan, dari disimpan sampai tahap wawancara.",
    wide: false,
  },
]

export function FeatureGrid() {
  return (
    <section id="fitur" className="shell mx-auto max-w-shell scroll-mt-20 border-t border-line py-20">
      <div className="max-w-2xl space-y-4">
        <p className="text-xs uppercase tracking-wider text-muted">Isi produk</p>
        <h2 className="hand text-4xl leading-tight text-ink sm:text-5xl">
          Lima hal yang dikerjakan Dilirik
        </h2>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {features.map((feature) => (
          <article
            key={feature.title}
            className={
              "rounded-[14px] border border-line bg-panel p-6 sm:p-7 " +
              (feature.wide ? "sm:col-span-2" : "")
            }
          >
            <h3 className="hand text-2xl text-ink">{feature.title}</h3>
            <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-ink/80">
              {feature.body}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}
