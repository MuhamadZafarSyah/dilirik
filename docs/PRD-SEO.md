# PRD — SEO, GEO, Analytics & Core Web Vitals

> Status: **DRAFT untuk direview** · Dibuat 29 Juli 2026 · Pemilik: @MuhamadZafarSyah
>
> Dokumen ini **perencanaan**, bukan implementasi. Tidak ada kode produksi yang
> berubah di PR yang membawa dokumen ini. Setiap fase dieksekusi lewat PR sendiri
> yang merujuk nomor bagian di dokumen ini.
>
> Dokumen ini melengkapi PRD utama Dilirik (yang dirujuk di komentar
> `schema.prisma` sebagai §9, §14, §7.7). Penomoran di sini berdiri sendiri.

---

## 1. Latar & tujuan

Dilirik sudah punya produk yang berjalan (analisis CV, revisi, kanban lamaran,
live mock interview, cover letter generator) tetapi **belum bisa ditemukan**.
Saat ini situs hanya punya ~5 URL publik dan nol infrastruktur SEO.

Tujuan bisnis: **akuisisi organik menjadi kanal utama pendaftaran**, menggantikan
ketergantungan pada sharing manual.

Tujuan teknis dokumen ini:

1. Membuat situs bisa dirayapi, diindeks, dan dipahami mesin pencari.
2. Membuat konten Dilirik bisa **dikutip** oleh mesin generatif (AI Overviews,
   ChatGPT, Perplexity) — ini yang disebut GEO.
3. Mengukur semuanya dengan analytics gratis yang tidak merusak performa.
4. Menaikkan Core Web Vitals ke zona "Good" untuk user asli, bukan cuma lab.

### 1.1 Ekspektasi yang perlu diselaraskan

Permintaan awal adalah "muncul paling atas di Google". Perlu dicatat dengan jujur
— sejalan dengan posisi produk Dilirik sendiri yang menolak mengarang:

- Meta tag, `robots.txt`, `sitemap.xml`, dan Lighthouse 100 adalah **tiket masuk**,
  bukan faktor pemenang. Semuanya bisa diselesaikan dalam 2 PR.
- Yang menentukan peringkat adalah **jumlah halaman yang menjawab pertanyaan
  spesifik pencari kerja** dan **siapa yang menautkan ke kita**.
- Situs 5 halaman dengan Lighthouse 100 akan kalah dari situs 300 halaman dengan
  Lighthouse 70. Fase 3 adalah mesin peringkat sesungguhnya; Fase 1–2 hanya
  memastikan mesin itu tidak tersumbat.
- Peringkat #1 untuk kata kunci kompetitif adalah hasil 6–12 bulan, bukan 1 sprint.

---

## 2. Non-tujuan

- Tidak membeli backlink atau memakai jasa PBN.
- Tidak membuat konten AI massal tanpa penyuntingan manusia.
- Tidak memakai CMP (consent management platform) berbayar.
- Tidak memakai analytics berbayar. Semua yang dipilih harus punya free tier
  yang cukup untuk skala saat ini.
- Tidak mengejar Lighthouse 100 di halaman `/app/*` (dashboard di balik login
  tidak diindeks, jadi tidak relevan untuk SEO).

---

## 3. Kondisi saat ini (audit 29 Juli 2026)

| Item | Status | Dampak |
|---|---|---|
| `metadata` root layout | Hanya `title` + `description` | Tidak ada OG, Twitter card, canonical, `metadataBase` |
| `metadataBase` | ❌ | URL OG jadi relatif → preview rusak saat di-share |
| `robots.txt` | ❌ | Tidak ada arahan crawl; `/app/*` berisiko terindeks |
| `sitemap.xml` | ❌ | Google harus menebak struktur situs |
| Folder `public/` | ❌ tidak ada sama sekali | Tidak ada favicon, OG image, webmanifest |
| JSON-LD structured data | ❌ | Tidak eligible rich result; lemah untuk GEO |
| Analytics | ❌ belum terpasang | PostHog sudah disebut di CSP tapi belum dieksekusi |
| `hreflang` | ❌ | UI punya `useI18n` (id/en) tapi tidak ada URL terpisah per bahasa |
| Halaman publik | `/`, `/pricing`, `/legal/*`, `/login`, `/register` | ~5 URL — ini akar masalahnya |
| Lighthouse CI | ❌ | Tidak ada pengaman regresi performa |

### 3.1 Tiga temuan kritis

**T1 — CSP saat ini akan memblokir Google Analytics.**
Di `apps/web/next.config.mjs`, `script-src` tidak memuat `googletagmanager.com`
dan `connect-src` tidak memuat `google-analytics.com`. Kalau GA4 dipasang tanpa
mengubah CSP, skripnya **mati total di production tapi jalan normal di
localhost** (karena CSP dikirim lewat `headers()` yang aktif di dev juga, tetapi
blokirnya sering hanya muncul sebagai warning konsol yang terlewat). Ini wajib
diubah dalam PR yang sama dengan pemasangan analytics, bukan setelahnya.

**T2 — Tidak ada `metadataBase`.**
Akibatnya semua URL gambar OG jadi relatif dan preview rusak di WhatsApp,
LinkedIn, dan Twitter — padahal itu kanal distribusi utama untuk produk pencari
kerja Indonesia.

**T3 — `apps/web/app/page.tsx` berukuran 43 KB dalam satu file.**
CSP membutuhkan `unsafe-eval` untuk framer-motion, indikasi kuat landing page
berat di sisi klien. Ini kandidat utama penyebab TBT/INP jelek. **Inilah yang
berdiri antara Dilirik dan Lighthouse 100**, bukan meta tag. Perlu diverifikasi
dengan profiling sebelum dipecah — jangan refactor berdasarkan asumsi.

---

## 4. Keputusan yang sudah diambil

| # | Topik | Keputusan | Catatan |
|---|---|---|---|
| K1 | Domain kanonik | `https://dilirik.tech` (apex, tanpa `www`) | Semua `www.*` di-301 ke apex; satu sumber kebenaran untuk canonical |
| K2 | Stack analytics | **GA4 + PostHog Cloud**, keduanya free tier | Alasan di §7.1 |
| K3 | Cookie consent | **Consent Mode v2 + banner ringan buatan sendiri** | Alasan di §7.2 |
| K4 | Crawler AI | **Izinkan semua** (GPTBot, ClaudeBot, PerplexityBot, dll) | Maksimalkan GEO; konsekuensi di §10 |
| K5 | Cakupan | Ketiga fase disetujui, dieksekusi bertahap | Urutan PR di §12 |

---

## 5. Metrik keberhasilan

| Metrik | Baseline | Target 3 bulan | Target 6 bulan | Sumber |
|---|---|---|---|---|
| Halaman terindeks | ~0 | 60 | 250 | Search Console |
| Klik organik / bulan | 0 | 500 | 3.000 | Search Console |
| Kata kunci di top 10 | 0 | 10 | 50 | Search Console |
| Pendaftaran dari organik | 0 | 100 | 600 | GA4 event `sign_up` |
| LCP (p75, field) | belum diukur | < 2,5 s | < 2,0 s | GA4 web-vitals |
| INP (p75, field) | belum diukur | < 200 ms | < 150 ms | GA4 web-vitals |
| CLS (p75, field) | belum diukur | < 0,1 | < 0,05 | GA4 web-vitals |
| Lighthouse landing (lab) | belum diukur | ≥ 95 semua kategori | 100/100/100/100 | Lighthouse CI |
| Kutipan di mesin generatif | 0 | terpantau manual | 10 kutipan | Cek manual bulanan |

> Catatan metode: angka **field** (dari user asli) adalah yang dipakai Google untuk
> peringkat, bukan angka lab Lighthouse. Karena itu §7.4 mewajibkan pengiriman
> web-vitals ke analytics, bukan hanya mengandalkan CI.

---

## 6. Fase 1 — Fondasi teknis SEO

Dampak besar, risiko kecil, tidak menyentuh logika bisnis.

### 6.1 Metadata

- Set `metadataBase: new URL("https://dilirik.tech")` di root layout.
- Root layout memegang default: `title.template`, `description`, `openGraph`,
  `twitter`, `robots`, `icons`, `alternates.canonical`.
- Setiap halaman publik mengekspor `metadata` atau `generateMetadata` sendiri
  dengan judul & deskripsi unik. **Judul duplikat adalah masalah SEO nyata.**
- Panjang: judul ≤ 60 karakter, deskripsi 120–155 karakter.
- `robots: { index: false }` eksplisit untuk `/app/*` dan halaman auth, sebagai
  lapisan kedua setelah `robots.txt`.

Peta judul awal (draf, perlu review):

| URL | Judul | Target kata kunci |
|---|---|---|
| `/` | Dilirik — Cek Kecocokan CV dengan Lowongan, Gratis | cek cv, analisis cv gratis |
| `/pricing` | Harga Dilirik — Mulai Gratis, Tanpa Kartu Kredit | harga, gratis |
| `/legal/privacy` | Kebijakan Privasi — Dilirik | — (noindex opsional) |
| `/legal/terms` | Syarat & Ketentuan — Dilirik | — |

### 6.2 `app/robots.ts`

Memakai konvensi Next.js App Router (menghasilkan `/robots.txt` otomatis).

- `allow: "/"` untuk semua user-agent.
- `disallow`: `/app/`, `/api/`, `/login`, `/register`.
- Deklarasikan `sitemap: "https://dilirik.tech/sitemap.xml"`.
- Sesuai K4, **tidak ada blok** untuk GPTBot, ClaudeBot, PerplexityBot,
  Google-Extended, CCBot, Bytespider.

### 6.3 `app/sitemap.ts`

- Catatan koreksi: standarnya **`sitemap.xml`**, bukan `sitemap.txt`. Next.js
  menghasilkannya dari `app/sitemap.ts`.
- Fase 1: URL statis saja (`/`, `/pricing`, `/legal/*`).
- Fase 3: gabungkan URL blog & halaman programatik secara dinamis.
- Isi `lastModified`, `changeFrequency`, `priority` yang jujur — jangan set semua
  `priority: 1.0`, itu diabaikan Google.
- Bila URL melebihi 50.000, pecah jadi sitemap index (belum relevan sekarang).

### 6.4 Aset `public/`

Folder ini **belum ada** dan harus dibuat.

| Berkas | Ukuran | Fungsi |
|---|---|---|
| `favicon.ico` | 32×32 | Tab browser, hasil pencarian |
| `icon.png` | 512×512 | PWA, Android |
| `apple-icon.png` | 180×180 | iOS home screen |
| `og-image.png` | 1200×630 | Preview WhatsApp/LinkedIn/Twitter |
| `site.webmanifest` | — | Kategori PWA di Lighthouse |

Desain OG image mengikuti `DESIGN_SYSTEM.md` (paper texture, tone kertas,
font hand/scrawl) supaya konsisten dengan brand. Pertimbangkan OG dinamis lewat
`ImageResponse` untuk halaman blog di Fase 3.

### 6.5 Structured data (JSON-LD)

Semua sebagai `<script type="application/ld+json">` yang dirender server.

| Skema | Lokasi | Manfaat |
|---|---|---|
| `SoftwareApplication` | `/` | Rich result aplikasi, harga, rating |
| `Organization` | root layout | Knowledge panel, logo di SERP |
| `FAQPage` | `/` | Akordeon FAQ langsung di SERP |
| `BreadcrumbList` | halaman dalam | Breadcrumb di SERP |
| `Article` | tiap post blog (Fase 3) | Eligible Top Stories & kutipan AI |

JSON-LD adalah **jalur termurah menuju GEO**: mesin generatif memakainya untuk
memastikan fakta sebelum mengutip.

### 6.6 Perubahan CSP (wajib, lihat T1)

Di `apps/web/next.config.mjs`:

- `script-src`: tambah `https://www.googletagmanager.com` dan `https://*.posthog.com`.
- `connect-src`: tambah `https://www.google-analytics.com`,
  `https://*.google-analytics.com`, `https://*.analytics.google.com`,
  `https://www.googletagmanager.com`. (`https://*.posthog.com` sudah ada.)
- `img-src` sudah memuat `https:` — cukup.
- Ubah `X-DNS-Prefetch-Control` dari `off` menjadi `on` (kemenangan kecil untuk LCP).

Risiko: melonggarkan CSP mengurangi proteksi XSS yang sengaja diperketat di
PR #9. Mitigasi: hanya menambah host spesifik, tidak pernah wildcard `*`, dan
`object-src 'none'` serta `base-uri 'self'` tetap dipertahankan.

---

## 7. Fase 2 — Analytics & Core Web Vitals

### 7.1 Stack analytics terpilih (K2)

Rekomendasi: **GA4 + PostHog Cloud**, keduanya gratis dan saling melengkapi.

| Kebutuhan | Alat | Alasan |
|---|---|---|
| Akuisisi & SEO | **GA4** | Satu-satunya yang terintegrasi langsung dengan Search Console; wajib kalau tujuannya peringkat Google. Gratis tanpa batas praktis. |
| Perilaku produk | **PostHog Cloud** | Free tier 1 juta event/bulan + 5.000 session replay/bulan. Funnel & replay yang tidak dimiliki GA4. **Sudah diantisipasi di CSP repo ini.** |

Alternatif yang ditolak, beserta alasannya:

- **Vercel Web Analytics** — free tier Hobby hanya 2.500 event/bulan, terlalu
  cepat habis, dan tidak punya funnel.
- **Plausible / Fathom** — bagus dan ringan, tapi **berbayar**. Melanggar batasan
  "harus gratis".
- **Umami self-hosted** — gratis, tapi menambah beban ops (DB + hosting) untuk
  keuntungan yang tidak sebanding dengan PostHog free tier.

Catatan implementasi: GA4 dipasang lewat `@next/third-parties/google`
(`GoogleAnalytics`), bukan tag `<script>` mentah — paket resmi Next.js ini memuat
skrip dengan strategi yang tidak memblokir render.

### 7.2 Cookie consent (K3)

Rekomendasi: **Google Consent Mode v2 dengan default `denied`, ditambah banner
ringan buatan sendiri.**

Alasan:

- Indonesia sudah punya **UU PDP No. 27/2022** yang mewajibkan dasar persetujuan
  untuk pemrosesan data pribadi. Menganggap "user Indonesia jadi tidak perlu
  consent" adalah asumsi yang salah.
- Consent Mode v2 tetap mengirim **ping tanpa cookie** saat consent ditolak, jadi
  data agregat tidak hilang total — ini keunggulan besar dibanding memblokir
  skrip mentah-mentah.
- Banner buatan sendiri (dua tombol, pilihan disimpan di `localStorage`) cukup;
  CMP berbayar berlebihan untuk skala ini dan biasanya justru menambah CLS.

Syarat implementasi:

- Default: `analytics_storage: denied`, `ad_storage: denied`.
- Banner dirender **setelah** LCP dan memakai `position: fixed` dengan tinggi
  yang sudah dipesan → kontribusi CLS harus **0**.
- Ada tautan untuk mengubah pilihan di `/legal/privacy`.
- Banner tidak boleh menutupi CTA utama di mobile.

### 7.3 Taksonomi event

Event minimum yang dikirim ke kedua alat, memakai nama `snake_case` konsisten:

| Event | Kapan | Properti |
|---|---|---|
| `sign_up` | Registrasi berhasil | `method` |
| `cv_uploaded` | CV tersimpan | `source` (upload/paste) |
| `analysis_completed` | Analisis selesai | `match_score`, `cached` |
| `cover_letter_generated` | Surat dibuat | `tone`, `language`, `length` |
| `interview_session_ended` | Sesi interview selesai | `persona`, `duration_sec` |
| `export_downloaded` | Unduh dokumen | `format`, `module` |
| `quota_exceeded` | Kuota habis | `module` |

`quota_exceeded` sengaja dilacak: itu sinyal paling jelas untuk menentukan harga.

**Larangan:** jangan pernah mengirim isi CV, teks lowongan, isi surat lamaran,
nama, atau email ke analytics. Hanya metadata dan angka.

### 7.4 Core Web Vitals

Budget performa (diberlakukan di CI):

| Metrik | Budget |
|---|---|
| LCP | < 2,0 s |
| INP | < 200 ms |
| CLS | < 0,05 |
| TBT | < 200 ms |
| JS transfer (landing) | < 180 KB terkompresi |

Teknik yang direncanakan:

1. **Verifikasi dulu, refactor kemudian.** Profil `app/page.tsx` (43 KB) sebelum
   memecahnya. Jangan refactor berdasarkan dugaan.
2. Konten landing menjadi **server component**; `"use client"` hanya di bagian
   yang benar-benar interaktif.
3. Section di bawah lipatan dimuat lewat `next/dynamic`.
4. **Audit font.** Saat ini tiga keluarga font Google (Inter, Caveat, Gochi Hand)
   semuanya `preload: true`. Tiga font yang dipreload adalah beban LCP nyata —
   evaluasi apakah Caveat dan Gochi keduanya benar-benar diperlukan di
   *first paint*, atau salah satunya boleh `preload: false`.
5. Semua gambar lewat `next/image` dengan `width`/`height` eksplisit
   (mencegah CLS), `priority` hanya untuk gambar LCP.
6. Audit `framer-motion`: animasi masuk yang menggeser layout adalah sumber CLS
   klasik. Pastikan animasi memakai `transform`/`opacity` saja.
7. Kirim `web-vitals` ke GA4 lewat `useReportWebVitals` → data **field**, yang
   dipakai Google untuk peringkat.

### 7.5 Lighthouse CI

Workflow GitHub Actions baru yang menjalankan Lighthouse pada setiap PR yang
menyentuh `apps/web/`, dengan budget di §7.4 sebagai *assertion*. Gagal budget =
PR merah. Ini mencegah skor yang sudah susah dinaikkan turun diam-diam.

Halaman yang diuji: `/`, `/pricing`. Halaman `/app/*` dikecualikan (butuh login,
dan tidak diindeks).

---

## 8. Fase 3 — Konten & GEO

Ini mesin peringkat sesungguhnya. Fase 1–2 hanya membuka jalannya.

### 8.1 Blog (`/blog`)

- MDX, dirender statis, dengan `Article` JSON-LD.
- Target: 2 tulisan per minggu, panjang 1.200–2.000 kata.
- Sudut pandang yang membedakan: **kejujuran**. Produk ini menolak mengarang, dan
  itu sudut editorial yang belum dipakai kompetitor — mis. "Kenapa CV yang
  dilebih-lebihkan justru gagal di tahap interview".
- Tema awal: cara kerja ATS, kesalahan CV fresh graduate, cara menjawab
  "ceritakan tentang dirimu", template cover letter per industri.

### 8.2 Halaman programatik

Satu template menghasilkan puluhan hingga ratusan URL. Inilah cara realistis
situs 5 halaman berubah jadi 300 halaman.

| Pola URL | Perkiraan jumlah | Contoh |
|---|---|---|
| `/contoh-cv/[posisi]` | 50–100 | `/contoh-cv/backend-engineer` |
| `/template-cover-letter/[industri]` | 20–30 | `/template-cover-letter/perbankan` |
| `/pertanyaan-interview/[posisi]` | 50–100 | `/pertanyaan-interview/data-analyst` |

**Aturan mutlak:** setiap halaman harus punya nilai unik yang nyata (contoh asli,
rincian spesifik posisi). Halaman template yang hanya berganti kata kunci akan
dihukum sebagai *doorway page* oleh Google. Lebih baik 30 halaman bagus daripada
300 halaman kosong.

### 8.3 GEO (Generative Engine Optimization)

Tujuan: menjadi sumber yang **dikutip** AI, bukan sekadar diperingkat Google.

1. **`/llms.txt`** — ringkasan terstruktur produk & halaman penting dalam format
   yang mudah dicerna LLM.
2. **Struktur mudah dikutip** — setiap artikel dibuka dengan jawaban ringkas 2–3
   kalimat sebelum penjelasan panjang. Mesin generatif mengutip paragraf yang
   berdiri sendiri.
3. **Statistik orisinal** — dari data agregat Dilirik sendiri (mis. distribusi
   skor kecocokan, gap yang paling sering muncul). Data orisinal adalah magnet
   kutipan sekaligus magnet backlink. **Wajib teragregasi & anonim.**
4. **Heading berbentuk pertanyaan** — selaras dengan cara orang bertanya ke AI.
5. `Article` + `FAQPage` JSON-LD di setiap tulisan (lihat §6.5).

### 8.4 Search Console & verifikasi

- Daftarkan `dilirik.tech` di Google Search Console (verifikasi lewat DNS TXT,
  bukan file HTML — lebih tahan deploy) dan Bing Webmaster Tools.
- Kirim sitemap secara manual sekali, sisanya otomatis.
- Tautkan GA4 ↔ Search Console agar kueri pencarian terlihat di GA4.
- Pantau laporan Core Web Vitals & Page Indexing setiap bulan.

---

## 9. Peta file

| Berkas | Aksi | Fase |
|---|---|---|
| `apps/web/app/layout.tsx` | Ubah — metadata lengkap, JSON-LD, analytics | 1, 2 |
| `apps/web/app/robots.ts` | Baru | 1 |
| `apps/web/app/sitemap.ts` | Baru | 1 |
| `apps/web/app/page.tsx` | Ubah — metadata, JSON-LD, pecah komponen | 1, 2 |
| `apps/web/app/pricing/page.tsx` | Ubah — metadata unik | 1 |
| `apps/web/app/legal/**` | Ubah — metadata unik | 1 |
| `apps/web/public/*` | Baru — favicon, OG, webmanifest | 1 |
| `apps/web/next.config.mjs` | Ubah — CSP + DNS prefetch | 1 |
| `apps/web/components/seo/json-ld.tsx` | Baru | 1 |
| `apps/web/components/analytics/*` | Baru — provider + banner consent | 2 |
| `apps/web/lib/analytics.ts` | Baru — wrapper `track()` | 2 |
| `apps/web/app/llms.txt/route.ts` | Baru | 3 |
| `apps/web/app/blog/**` | Baru | 3 |
| `apps/web/content/blog/*.mdx` | Baru | 3 |
| `.github/workflows/lighthouse.yml` | Baru | 2 |
| `.env.example` | Ubah — env baru | 2 |

---

## 10. Risiko & mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| CSP memblokir analytics tanpa disadari | Data nol tanpa error terlihat | Ubah CSP di PR yang sama; verifikasi manual di production, bukan cuma localhost |
| Melonggarkan CSP melemahkan proteksi XSS dari PR #9 | Risiko keamanan | Hanya host spesifik, tanpa wildcard; `object-src 'none'` dipertahankan |
| Refactor landing page merusak tampilan | Regresi visual | Playwright sudah ada — tambah snapshot sebelum refactor |
| Banner consent menambah CLS | Merusak CWV yang sedang dikejar | Render setelah LCP, tinggi dipesan, uji CLS = 0 |
| Mengizinkan crawler AI (K4) | Konten dipakai tanpa atribusi | Keputusan sadar: eksposur GEO dinilai lebih berharga. Bisa dibalik kapan saja lewat `robots.ts` |
| Halaman programatik dianggap spam | Penalti manual Google | Minimum nilai unik per halaman; rilis bertahap, bukan 300 URL sekaligus |
| Statistik orisinal membocorkan data user | Pelanggaran privasi & UU PDP | Hanya agregat, minimum 100 sampel per angka, tanpa quasi-identifier |
| Skor Lighthouse turun diam-diam | Regresi perlahan | Lighthouse CI dengan budget yang memerahkan PR |

---

## 11. Variabel environment baru

| Variabel | Contoh | Wajib |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://dilirik.tech` | Ya — dipakai `metadataBase`, sitemap, canonical |
| `NEXT_PUBLIC_GA_ID` | `G-XXXXXXXXXX` | Ya (Fase 2) |
| `NEXT_PUBLIC_POSTHOG_KEY` | `phc_...` | Ya (Fase 2) |
| `NEXT_PUBLIC_POSTHOG_HOST` | `https://us.i.posthog.com` | Ya (Fase 2) |

Semuanya harus bersifat opsional di kode: kalau kosong, analytics tidak dimuat
dan aplikasi tetap berjalan normal — mengikuti pola `R2_*` dan `GOTENBERG_URL`
yang sudah ada di repo ini.

Ingat catatan di `AGENTS.md`: `.env` hanya ada di root, dan Next.js butuh
`cp .env apps/web/.env`.

---

## 12. Urutan PR

| PR | Isi | Bagian | Perkiraan |
|---|---|---|---|
| 1 | Dokumen PRD ini | — | selesai |
| 2 | Fondasi teknis SEO | §6 | S |
| 3 | Analytics + consent + CSP | §7.1–7.3 | M |
| 4 | Optimasi CWV + Lighthouse CI | §7.4–7.5 | M–L |
| 5 | Kerangka blog + `llms.txt` | §8.1, §8.3 | M |
| 6 | Halaman programatik (bertahap) | §8.2 | L |

PR 2 dan 3 sengaja dipisah agar perubahan CSP mudah di-*revert* sendiri kalau
ada masalah di production.

---

## 13. Pertanyaan terbuka

1. **Domain sudah dibeli dan mengarah ke hosting?** `metadataBase` dan sitemap
   butuh domain aktif agar bisa diverifikasi.
2. **Bahasa:** UI punya `useI18n` (id/en), tapi belum ada URL terpisah per bahasa.
   Apakah target hanya pasar Indonesia (satu bahasa, tanpa `hreflang`), atau perlu
   `/en/*` dengan `hreflang`? Ini memengaruhi struktur URL dan sitemap, jadi lebih
   murah diputuskan sekarang daripada nanti.
3. **Siapa yang menulis konten Fase 3?** Kalau tidak ada penulis tetap, Fase 3
   akan mangkrak dan Fase 1–2 tidak akan menghasilkan peringkat.
4. **Halaman legal: index atau noindex?** Biasanya di-index agar sinyal kepercayaan
   naik, tapi tidak masuk sitemap.
5. **Ada logo final?** Dibutuhkan untuk `Organization` JSON-LD, favicon, dan OG image.
