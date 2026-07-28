import JSZip from "jszip"

/**
 * Revisi DOCX secara NATIVE (Fase 1b — pertahankan desain asli).
 *
 * Prinsip: HANYA isi teks `<w:t>` yang diganti. Styling run (`<w:rPr>` — italic,
 * bold, font), tabel (`<w:tbl>`), dan layout tidak pernah disentuh, sehingga
 * reflow diurus Word/LibreOffice saat file dibuka.
 *
 * Mode `highlight` (untuk PREVIEW compare — jangan dipakai di file final):
 * teks pengganti dimasukkan sebagai run BARU dengan `<w:highlight w:val="yellow"/>`
 * (fitur "warna sorotan teks" native Word) — rPr run asli di-clone sehingga
 * bold/italic/font/warna tetap utuh, hanya ditambah sorotan. Prefix/suffix di
 * run yang terpotong tetap memakai formatting asli TANPA sorotan.
 *
 * Batasan yang DISENGAJA (lihat analisis — fallback-nya "terapkan manual"):
 * - `before` harus utuh dalam SATU paragraf (saran per-bullet memang begitu);
 *   jika melintasi paragraf → masuk `skipped`, teks rawText tetap ter-update.
 * - Jika `before` melintasi beberapa run, style `after` mengikuti run PERTAMA
 *   yang terlibat — benar untuk mayoritas bullet CV yang satu gaya.
 * - Matching toleran whitespace, karena rawText hasil extractText tidak
 *   byte-identik dengan isi XML (cleanup() mengubah spasi/newline).
 */

export type DocxReplacement = { before: string; after: string }

export type DocxReviseResult = {
  buffer: Buffer
  applied: DocxReplacement[]
  skipped: DocxReplacement[]
}

/** Palet `w:highlight` Word terbatas — yellow paling dekat dengan brand & paling terbaca. */
const HIGHLIGHT_COLOR = "yellow"

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
}

function decodeXml(s: string): string {
  return s.replace(/&(?:amp|lt|gt|quot|apos);/g, (m) => ENTITIES[m] ?? m)
}

function encodeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** Matcher toleran whitespace (spasi, newline, NBSP) antar kata. */
function tolerantRegex(before: string): RegExp {
  const pattern = before.trim().split(/\s+/).map(escapeRegExp).join("[\\s\\u00A0]+")
  return new RegExp(pattern)
}

type TextToken = {
  /** indeks '<' dari tag pembuka <w:t …> di XML paragraf */
  fullStart: number
  /** indeks setelah </w:t> */
  fullEnd: number
  /** atribut mentah pada tag pembuka (termasuk spasi awal), atau "" */
  attrs: string
  /** isi teks setelah decode entity */
  decoded: string
  /** posisi awal token ini dalam teks gabungan paragraf */
  combinedStart: number
}

type Edit = { start: number; end: number; text: string }

/** Cari run <w:r>…</w:r> yang membungkus posisi `index` di XML paragraf. */
function findEnclosingRun(
  paragraphXml: string,
  index: number,
): { xml: string; start: number; end: number } | null {
  const runRe = /<w:r(?:\s[^>]*)?>[\s\S]*?<\/w:r>/g
  let m: RegExpExecArray | null
  while ((m = runRe.exec(paragraphXml)) !== null) {
    if (m.index <= index && index < m.index + m[0].length) {
      return { xml: m[0], start: m.index, end: m.index + m[0].length }
    }
    if (m.index > index) break
  }
  return null
}

/** Ambil blok <w:rPr>…</w:rPr> milik sebuah run (atau "" bila tidak ada). */
function rPrOf(runXml: string): string {
  const m = /<w:rPr(?:\s[^>]*)?>[\s\S]*?<\/w:rPr>/.exec(runXml)
  return m ? m[0] : ""
}

/** Clone rPr + suntik <w:highlight>; highlight lama (kalau ada) diganti, bukan diduplikasi. */
function withHighlight(rPr: string): string {
  const tag = `<w:highlight w:val="${HIGHLIGHT_COLOR}"/>`
  if (!rPr) return `<w:rPr>${tag}</w:rPr>`
  const clean = rPr.replace(/<w:highlight[^>]*\/>/g, "")
  return clean.replace("</w:rPr>", `${tag}</w:rPr>`)
}

/** Coba terapkan SATU penggantian pada XML satu paragraf. Return XML baru atau null. */
function replaceInParagraphXml(
  paragraphXml: string,
  before: string,
  after: string,
  highlight: boolean,
): string | null {
  const tokens: TextToken[] = []
  const re = /<w:t(\s[^>]*)?>([\s\S]*?)<\/w:t>/g
  let combined = ""
  let m: RegExpExecArray | null
  while ((m = re.exec(paragraphXml)) !== null) {
    const decoded = decodeXml(m[2] ?? "")
    tokens.push({
      fullStart: m.index,
      fullEnd: m.index + m[0].length,
      attrs: m[1] ?? "",
      decoded,
      combinedStart: combined.length,
    })
    combined += decoded
  }
  if (tokens.length === 0) return null

  const match = tolerantRegex(before).exec(combined)
  if (!match) return null
  const start = match.index
  const end = start + match[0].length

  // Run-run yang teksnya beririsan dengan rentang match (run fragmentation)
  const involved = tokens.filter(
    (t) => t.combinedStart < end && t.combinedStart + t.decoded.length > start,
  )
  if (involved.length === 0) return null
  const first = involved[0]!
  const last = involved[involved.length - 1]!

  const prefix = first.decoded.slice(0, Math.max(0, start - first.combinedStart))
  const suffix = last.decoded.slice(Math.max(0, end - last.combinedStart))

  // Mode highlight butuh run pembungkus token pertama (untuk clone rPr &
  // titik sisip run baru). Kalau tidak ketemu (XML tak lazim) → fallback
  // ke perilaku tanpa highlight agar penggantian tetap terjadi.
  const firstRun = highlight ? findEnclosingRun(paragraphXml, first.fullStart) : null

  const newTexts = new Map<TextToken, string>()
  const edits: Edit[] = []

  if (firstRun) {
    // Run pertama hanya menampung prefix (formatting asli, tanpa sorotan);
    // teks baru masuk run BARU ber-highlight; suffix (bila run yang sama)
    // masuk run baru lagi TANPA highlight — formatting asli tetap.
    newTexts.set(first, prefix)
    for (const t of involved.slice(1)) newTexts.set(t, t === last ? suffix : "")
    const rPr = rPrOf(firstRun.xml)
    let inserted = `<w:r>${withHighlight(rPr)}<w:t xml:space="preserve">${encodeXml(after)}</w:t></w:r>`
    if (first === last && suffix) {
      inserted += `<w:r>${rPr}<w:t xml:space="preserve">${encodeXml(suffix)}</w:t></w:r>`
    }
    edits.push({ start: firstRun.end, end: firstRun.end, text: inserted })
  } else {
    // Run pertama menampung prefix + after (+ suffix bila run sama);
    // run lain yang terlibat DIKOSONGKAN teksnya — elemen & styling run tetap ada.
    newTexts.set(first, prefix + after + (first === last ? suffix : ""))
    for (const t of involved.slice(1)) newTexts.set(t, t === last ? suffix : "")
  }

  for (const t of tokens) {
    if (!newTexts.has(t)) continue
    const attrs = t.attrs.includes("xml:space") ? t.attrs : `${t.attrs} xml:space="preserve"`
    edits.push({
      start: t.fullStart,
      end: t.fullEnd,
      text: `<w:t${attrs}>${encodeXml(newTexts.get(t)!)}</w:t>`,
    })
  }

  // Terapkan dari belakang agar indeks tetap valid (sisipan run tidak pernah
  // bertabrakan dengan rewrite <w:t> karena berada di batas </w:r>).
  edits.sort((a, b) => b.start - a.start)
  let result = paragraphXml
  for (const e of edits) result = result.slice(0, e.start) + e.text + result.slice(e.end)
  return result
}

/** Terapkan 1 penggantian pada document.xml utuh — hanya paragraf pertama yang cocok. */
function replaceOnce(xml: string, before: string, after: string, highlight: boolean): string | null {
  const pRe = /<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g
  let m: RegExpExecArray | null
  while ((m = pRe.exec(xml)) !== null) {
    const updated = replaceInParagraphXml(m[0], before, after, highlight)
    if (updated) return xml.slice(0, m.index) + updated + xml.slice(m.index + m[0].length)
  }
  return null
}

export async function reviseDocx(args: {
  buffer: Buffer
  replacements: DocxReplacement[]
  /** Sorot teks pengganti dengan warna stabilo Word — HANYA untuk preview compare. */
  highlight?: boolean
}): Promise<DocxReviseResult> {
  const zip = await JSZip.loadAsync(args.buffer)
  const entry = zip.file("word/document.xml")
  if (!entry) throw new Error("DOCX_INVALID: word/document.xml tidak ditemukan")
  let xml = await entry.async("string")

  const applied: DocxReplacement[] = []
  const skipped: DocxReplacement[] = []
  for (const r of args.replacements) {
    if (!r.before?.trim() || !r.after?.trim()) {
      skipped.push(r)
      continue
    }
    const updated = replaceOnce(xml, r.before, r.after, args.highlight ?? false)
    if (updated) {
      xml = updated
      applied.push(r)
    } else {
      skipped.push(r)
    }
  }

  zip.file("word/document.xml", xml)
  const buffer = (await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  })) as Buffer
  return { buffer, applied, skipped }
}
