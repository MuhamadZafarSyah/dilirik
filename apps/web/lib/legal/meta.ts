/**
 * Konstanta yang dipakai bersama oleh seluruh halaman legal.
 *
 * Alamat kontak sengaja TIDAK diubah dari teks yang sudah tayang. Mengganti
 * alamat kontak di dokumen legal adalah perubahan substansi, bukan perubahan
 * tampilan, jadi itu keputusan pemilik produk.
 */
export const LEGAL_CONTACT_EMAIL = "halo@dilirik.app"

export const PRIVACY_LAST_UPDATED = "2026-07-29"
export const TERMS_LAST_UPDATED = "2026-07-29"

/**
 * Dipaksa ke zona UTC supaya tanggal yang tampil tidak bergeser satu hari
 * tergantung zona waktu server yang merender halaman.
 */
const legalDateFormatter = new Intl.DateTimeFormat("id-ID", {
	day: "numeric",
	month: "long",
	year: "numeric",
	timeZone: "UTC",
})

export function formatLegalDate(isoDate: string): string {
	const parsed = new Date(isoDate + "T00:00:00Z")
	if (Number.isNaN(parsed.getTime())) return isoDate
	return legalDateFormatter.format(parsed)
}
