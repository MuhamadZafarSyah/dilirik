import JSZip from "jszip"

/**
 * Pembuat DOCX untuk cover letter — surat lamaran adalah dokumen BARU (bukan
 * patch file desain user seperti `docxRevise.ts`), jadi kita rakit OOXML
 * minimal dari nol.
 *
 * Zero dependency baru: JSZip sudah dipakai `docxRevise.ts`.
 * PDF tidak dirender di sini — DOCX ini dikonversi lewat Gotenberg supaya
 * hasil Word dan PDF benar-benar identik (pola yang sama dengan modul CV).
 */

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`

const DOCUMENT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`

// Calibri 11pt, line spacing 1.15 — netral dan aman dibaca ATS maupun manusia.
const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="200" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults></w:styles>`

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/** Satu paragraf DOCX; newline tunggal di dalam paragraf jadi soft break `<w:br/>`. */
function paragraphXml(text: string, opts: { bold?: boolean } = {}): string {
  const rPr = opts.bold ? "<w:rPr><w:b/></w:rPr>" : ""
  const runs = text
    .split("\n")
    .map((line) => `<w:t xml:space="preserve">${escapeXml(line)}</w:t>`)
    .join("<w:br/>")
  return `<w:p><w:r>${rPr}${runs}</w:r></w:p>`
}

export async function buildCoverLetterDocx(args: {
  bodyText: string
  /** Ditulis tebal di baris pertama; kosongkan untuk surat tanpa judul. */
  heading?: string
}): Promise<Buffer> {
  const blocks = args.bodyText
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)

  const body = [
    args.heading ? paragraphXml(args.heading, { bold: true }) : "",
    ...blocks.map((block) => paragraphXml(block)),
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1418" w:right="1418" w:bottom="1418" w:left="1418"/></w:sectPr>',
  ]
    .filter(Boolean)
    .join("")

  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`

  const zip = new JSZip()
  zip.file("[Content_Types].xml", CONTENT_TYPES)
  zip.file("_rels/.rels", ROOT_RELS)
  zip.file("word/document.xml", document)
  zip.file("word/_rels/document.xml.rels", DOCUMENT_RELS)
  zip.file("word/styles.xml", STYLES)

  return (await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" })) as Buffer
}

/** Slug aman untuk nama file unduhan. */
export function slugify(text: string, fallback = "cover-letter"): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || fallback
  )
}
