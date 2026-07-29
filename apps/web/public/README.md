# Aset statis `apps/web/public`

Jalur berkas di bawah ini **sudah dirujuk oleh kode** (`app/layout.tsx` dan
`public/site.webmanifest`). Berkasnya masih belum ada karena logo final belum
siap — nama dan ukurannya sengaja dipatok sekarang supaya nanti cukup menaruh
berkas dengan nama yang sama, **tanpa mengubah satu baris kode pun**.

| Berkas | Ukuran | Format | Dipakai untuk |
| --- | --- | --- | --- |
| `favicon.ico` | 32x32 | ICO | Tab browser, bookmark |
| `icon.png` | 512x512 | PNG | Manifest PWA, `logo` di JSON-LD Organization |
| `apple-icon.png` | 180x180 | PNG | Ikon home screen iOS |
| `og-image.png` | 1200x630 | PNG | Pratinjau tautan (WhatsApp, LinkedIn, X, Slack) |

## Catatan penting

- **Wajib ada sebelum deploy pertama.** Selama berkas ini belum ada, permintaan
  ke `/favicon.ico` dan `/og-image.png` akan menjawab 404, dan pratinjau tautan
  tampil kosong. Situs belum di-deploy, jadi belum ada dampak nyata sekarang.
- **Gunakan PNG, jangan SVG, untuk `og-image`.** WhatsApp dan beberapa crawler
  lain tidak merender SVG pada pratinjau tautan.
- **Warna latar** yang konsisten dengan design system: `#f2e8d5` (paper) dengan
  tinta `#2a241d` (ink).
- **Jangan ganti nama berkas.** Kalau nama harus berubah, ubah di
  `apps/web/lib/site.ts` (`ogImagePath`, `logoPath`) dan `app/layout.tsx`, bukan
  di banyak tempat.
