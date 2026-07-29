/**
 * Satu pasal halaman legal. Judul dipakai dua kali: sebagai heading pasal dan
 * sebagai entri daftar isi, jadi teksnya hanya boleh ditulis di satu tempat.
 */
export type LegalArticle = {
	id: string
	title: string
	paragraphs: readonly string[]
}
