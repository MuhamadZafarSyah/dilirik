import JSZip from "jszip"

/**
 * Revisi DOCX secara NATIVE (Fase 1b — pertahankan desain asli).
 *
 * Prinsip: HANYA isi teks `<w:t>` yang diganti. Styling run (`<w:rPr>` — italic,
 * bold, font), tabel (`<w:tbl>`), dan layout tidak pernah disentuh, sehingga
 * reflow diurus Word/LibreOffice saat file dibuka.
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

/** Coba terapkan SATU penggantian pada XML satu paragraf. Return XML baru atau null. */
function replaceInParagraphXml(
  paragraphXml: string,
  before: string,
  after: string,
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

  // Run pertama menampung prefix + after (+ suffix bila run sama);
  // run lain yang terlibat DIKOSONGKAN teksnya — elemen & styling run tetap ada.
  const newTexts = new Map<TextToken, string>()
  newTexts.set(first, prefix + after + (first === last ? suffix : ""))
  for (const t of involved.slice(1)) newTexts.set(t, t === last ? suffix : "")

  // Tulis ulang dari belakang agar indeks tetap valid
  let result = paragraphXml
  for (const t of [...tokens].reverse()) {
    if (!newTexts.has(t)) continue
    const attrs = t.attrs.includes("xml:space") ? t.attrs : `${t.attrs} xml:space="preserve"`
    const replacement = `<w:t${attrs}>${encodeXml(newTexts.get(t)!)}</w:t>`
    result = result.slice(0, t.fullStart) + replacement + result.slice(t.fullEnd)
  }
  return result
}

/** Terapkan 1 penggantian pada document.xml utuh — hanya paragraf pertama yang cocok. */
function replaceOnce(xml: string, before: string, after: string): string | null {
  const pRe = /<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g
  let m: RegExpExecArray | null
  while ((m = pRe.exec(xml)) !== null) {
    const updated = replaceInParagraphXml(m[0], before, after)
    if (updated) return xml.slice(0, m.index) + updated + xml.slice(m.index + m[0].length)
  }
  return null
}

export async function reviseDocx(args: {
  buffer: Buffer
  replacements: DocxReplacement[]
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
    const updated = replaceOnce(xml, r.before, r.after)
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
