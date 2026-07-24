import mammoth from "mammoth"
import { HttpError } from "../middleware/errorHandler"

const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5MB

/** Ekstrak teks dari upload PDF/DOCX (PRD §7.2). Tipe lain ditolak rapi. */
export async function extractText(args: {
  buffer: Buffer
  mimeType: string
  originalName: string
}): Promise<string> {
  const { buffer, mimeType, originalName } = args
  if (buffer.byteLength > MAX_FILE_BYTES) {
    throw new HttpError(400, "FILE_TOO_LARGE", "Ukuran file maksimal 5MB")
  }
  const lower = originalName.toLowerCase()
  if (mimeType === "application/pdf" || lower.endsWith(".pdf")) {
    const { default: pdfParse } = await import("pdf-parse")
    const parsed = await pdfParse(buffer)
    return cleanup(parsed.text)
  }
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lower.endsWith(".docx")
  ) {
    const result = await mammoth.extractRawText({ buffer })
    return cleanup(result.value)
  }
  throw new HttpError(400, "UNSUPPORTED_FILE", "Format didukung: PDF atau DOCX")
}

function cleanup(text: string): string {
  const cleaned = text.replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim()
  if (cleaned.length < 50) {
    throw new HttpError(
      400,
      "EMPTY_EXTRACTION",
      "Teks tidak terbaca dari file (mungkin hasil scan). Coba paste teks CV secara manual.",
    )
  }
  return cleaned
}
