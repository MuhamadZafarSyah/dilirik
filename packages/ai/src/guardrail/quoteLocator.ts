/**
 * Pelokalan kutipan di dalam teks CV asli.
 *
 * SATU sumber kebenaran untuk pertanyaan "apakah kalimat ini benar-benar ada di
 * CV, dan di posisi mana persisnya". Sebelumnya pertanyaan itu dijawab di dua
 * tempat dengan aturan berbeda: postCheckAnchor memakai pencocokan verbatim
 * dengan toleransi whitespace, sedangkan enforceGapEvidence memakai
 * squashWhitespace + toLowerCase. Uji gold set #02 memperlihatkan akibatnya —
 * satu bullet CV yang sama LOLOS sebagai evidenceQuote tapi DITOLAK sebagai
 * anchor `before`. Dua guardrail saling bertentangan atas kalimat yang sama.
 *
 * Kenapa mengembalikan potongan teks, bukan boolean:
 * tujuan akhir sebuah anchor adalah auto-replace di dokumen user. Kalau posisi
 * kutipan sudah diketahui, menolak sarannya justru merugikan tanpa alasan —
 * lebih baik perbaiki kutipannya menjadi teks yang memang ada di dokumen.
 * Karena itu fungsi ini mengembalikan `canonical`: irisan rawText apa adanya.
 *
 * Yang DITOLERANSI hanyalah perbedaan yang tidak mengubah makna dan lazim
 * muncul saat teks diekstrak dari PDF. Parafrase tetap gagal — itu memang
 * tugasnya guardrail.
 */

/**
 * Karakter yang boleh disamakan dengan padanan ASCII-nya.
 *
 * Spasi tidak perlu didaftar: `\s` di JavaScript sudah mencakup NBSP, thin
 * space, dan kawan-kawannya. Ligatur didaftar karena ekstraksi PDF rutin
 * mengubah "fi" jadi satu glyph.
 */
const CHAR_FOLDS: Record<string, string> = {
  "\u2010": "-",
  "\u2011": "-",
  "\u2012": "-",
  "\u2013": "-",
  "\u2014": "-",
  "\u2015": "-",
  "\u2212": "-",
  "\u2018": "'",
  "\u2019": "'",
  "\u201a": "'",
  "\u201b": "'",
  "\u00b4": "'",
  "\u02bc": "'",
  "\u201c": '"',
  "\u201d": '"',
  "\u201e": '"',
  "\u201f": '"',
  "\u2026": "...",
  "\ufb00": "ff",
  "\ufb01": "fi",
  "\ufb02": "fl",
  "\ufb03": "ffi",
  "\ufb04": "ffl",
}

/** Karakter tanpa lebar — tidak terlihat mata, tapi mematahkan `includes`. */
const INVISIBLE = new Set(["\u00ad", "\u200b", "\u200c", "\u200d", "\u2060"])

/**
 * Teks yang sudah diseragamkan, beserta peta balik ke posisi aslinya.
 * `map[i]` = indeks karakter di teks asli yang menghasilkan `text[i]`.
 */
type FoldedText = { text: string; map: number[] }

function isSpace(char: string): boolean {
  return /\s/.test(char)
}

/** Lewati whitespace, sambil melaporkan apakah ada pergantian baris di dalamnya. */
function skipSpaces(input: string, from: number): { index: number; sawLineBreak: boolean } {
  let index = from
  let sawLineBreak = false
  while (index < input.length) {
    const char = input[index] as string
    if (INVISIBLE.has(char)) {
      index += 1
      continue
    }
    if (!isSpace(char)) break
    if (char === "\n" || char === "\r") sawLineBreak = true
    index += 1
  }
  return { index, sawLineBreak }
}

/**
 * Seragamkan teks sambil mencatat asal-usul tiap karakter.
 *
 * Peta indeks inilah alasan fungsi ini ditulis manual alih-alih memakai rantai
 * `.replace()`: tanpa peta, kita hanya tahu kutipannya ada, tidak tahu di mana,
 * jadi tidak bisa mengembalikan potongan aslinya.
 */
function fold(input: string): FoldedText {
  const chars: string[] = []
  const map: number[] = []
  let pendingSpace = false

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i] as string
    if (INVISIBLE.has(char)) continue

    const folded = CHAR_FOLDS[char] ?? char

    if (isSpace(folded)) {
      // Spasi di awal diabaikan; sisanya dirapatkan jadi satu.
      if (chars.length > 0) pendingSpace = true
      continue
    }

    // Pemenggalan baris ala PDF: "Media-\nPipe" sebenarnya satu kata.
    if (folded === "-") {
      const next = skipSpaces(input, i + 1)
      if (next.sawLineBreak) {
        i = next.index - 1
        continue
      }
    }

    if (pendingSpace) {
      chars.push(" ")
      map.push(i)
      pendingSpace = false
    }

    for (const piece of folded.toLowerCase()) {
      chars.push(piece)
      map.push(i)
    }
  }

  return { text: chars.join(""), map }
}

export type QuoteMatch = {
  /** Potongan rawText APA ADANYA — inilah yang aman dipakai untuk auto-replace. */
  canonical: string
  start: number
  end: number
}

/**
 * Cari `quote` di dalam `rawText`.
 *
 * @returns posisi & potongan asli bila ketemu, `null` bila tidak. `null` berarti
 *   kutipannya memang bukan teks CV (parafrase atau karangan), bukan sekadar
 *   beda tanda baca.
 */
export function locateQuote(quote: string, rawText: string): QuoteMatch | null {
  const needle = fold(quote ?? "")
  if (!needle.text) return null

  const haystack = fold(rawText ?? "")
  const at = haystack.text.indexOf(needle.text)
  if (at === -1) return null

  const start = haystack.map[at] as number
  const end = (haystack.map[at + needle.text.length - 1] as number) + 1
  return { canonical: rawText.slice(start, end), start, end }
}

/**
 * Bentuk kutipan yang dijamin ada di rawText, atau `null`.
 * Gula sintaks untuk pemanggil yang tidak peduli posisi.
 */
export function alignQuote(quote: string, rawText: string): string | null {
  return locateQuote(quote, rawText)?.canonical ?? null
}
