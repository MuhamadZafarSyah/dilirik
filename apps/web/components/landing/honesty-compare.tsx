const oldWay = [
  "CV yang sama dikirim ke lima puluh lowongan.",
  "AI umum menyarankan menambah pengalaman yang tidak kamu miliki.",
  "Wawancara teknis jadi tempat ketahuan.",
  "Tidak pernah tahu kenapa lamaran berhenti di penyaringan.",
]

const dilirikWay = [
  "Kata kunci diambil dari lowongan yang sedang kamu tuju.",
  "Saran revisi selalu menunjuk bukti di CV kamu.",
  "Semua yang tertulis bisa kamu pertanggungjawabkan saat wawancara.",
  "Skor dan daftar gap menunjukkan letak masalahnya.",
]

/**
 * Perbandingan dua kolom. Dipisah garis vertikal, bukan dua kartu berwarna,
 * supaya perbandingannya terbaca sebagai satu gagasan.
 */
export function HonestyCompare() {
  return (
    <section className="shell mx-auto max-w-shell border-t border-line py-20">
      <h2 className="hand max-w-2xl text-4xl leading-tight text-ink sm:text-5xl">
        Kenapa CV yang bagus tetap tidak dibaca
      </h2>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
        Biasanya bukan soal kurang pengalaman, tapi soal penyajian dan kata kunci
        yang tidak nyambung dengan lowongan.
      </p>

      <div className="mt-10 grid gap-10 sm:grid-cols-2 sm:gap-16">
        <div>
          <h3 className="text-sm uppercase tracking-wider text-muted">
            Cara yang biasa dipakai
          </h3>
          <ul className="mt-4 space-y-3">
            {oldWay.map((item) => (
              <li
                key={item}
                className="border-l-2 border-line pl-4 text-sm leading-relaxed text-muted"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm uppercase tracking-wider text-ink">
            Cara Dilirik
          </h3>
          <ul className="mt-4 space-y-3">
            {dilirikWay.map((item) => (
              <li
                key={item}
                className="border-l-2 border-red pl-4 text-sm leading-relaxed text-ink/80"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
