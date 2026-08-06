import { DEFAULT_REPORT_LANGUAGE, REPORT_LANGUAGES, type ReportLanguage } from "@dilirik/shared"

/**
 * Tentukan bahasa LAPORAN dengan urutan kepercayaan yang jelas:
 * 1. Yang diminta klien secara eksplisit — ini pilihan sadar pengguna di UI.
 * 2. Header Accept-Language — tebakan yang layak untuk klien lama yang belum
 *    mengirim field-nya.
 * 3. Default "id".
 *
 * Yang TIDAK pernah dipakai di sini: bahasa CV. Justru memakai bahasa CV sebagai
 * default itulah bug-nya — pelamar Indonesia menulis CV berbahasa Inggris untuk
 * dibaca ATS, bukan karena ingin membaca analisisnya dalam bahasa Inggris.
 */
export function resolveReportLanguage(args: {
  requested?: string | null
  acceptLanguage?: string | null
}): ReportLanguage {
  const requested = matchSupported(args.requested)
  if (requested) return requested

  for (const tag of parseAcceptLanguage(args.acceptLanguage)) {
    const supported = matchSupported(tag)
    if (supported) return supported
  }

  return DEFAULT_REPORT_LANGUAGE
}

/** "en-US" → "en". Mengembalikan null untuk bahasa yang tidak kita dukung. */
function matchSupported(value?: string | null): ReportLanguage | null {
  if (!value) return null
  const base = value.trim().toLowerCase().split("-")[0] ?? ""
  return (REPORT_LANGUAGES as readonly string[]).includes(base)
    ? (base as ReportLanguage)
    : null
}

/**
 * Urutkan tag Accept-Language berdasarkan bobot q, tertinggi lebih dulu.
 * "id-ID,id;q=0.9,en-US;q=0.8" → ["id-ID", "id", "en-US"]
 *
 * Tag tanpa q dianggap q=1 sesuai RFC 9110, dan q=0 berarti pengguna JUSTRU
 * menolak bahasa itu — karena itu dibuang, bukan sekadar ditaruh paling akhir.
 */
function parseAcceptLanguage(header?: string | null): string[] {
  if (!header) return []
  return header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";")
      const quality = params
        .map((param) => param.trim())
        .find((param) => param.startsWith("q="))
      const parsed = quality ? Number.parseFloat(quality.slice(2)) : 1
      return { tag: tag?.trim() ?? "", quality: Number.isFinite(parsed) ? parsed : 0 }
    })
    .filter((entry) => entry.tag.length > 0 && entry.quality > 0)
    .sort((a, b) => b.quality - a.quality)
    .map((entry) => entry.tag)
}
