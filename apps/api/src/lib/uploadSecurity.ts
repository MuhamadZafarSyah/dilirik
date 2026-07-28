import { HttpError } from "../middleware/errorHandler"

/**
 * Validasi file upload CV (anti file-spoofing / polyglot / MIME confusion):
 * 1. Allowlist MIME type + ekstensi (hanya PDF & DOCX).
 * 2. Cek magic bytes: isi file HARUS cocok dengan tipe yang diklaim.
 * 3. Nama file dinormalisasi (tanpa path traversal, panjang dibatasi).
 */
export const ALLOWED_CV_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
])

export function safeOriginalName(originalName: string): string {
  // Buang komponen path (traversal) & karakter kontrol, batasi panjang.
  const base = originalName.split(/[\\/]/).pop() ?? "file"
  // eslint-disable-next-line no-control-regex
  const cleaned = base.replace(/[\u0000-\u001F\u007F"<>|*?]/g, "").trim()
  return cleaned.slice(0, 120) || "file"
}

function isPdf(buffer: Buffer): boolean {
  // %PDF-
  return buffer.length > 5 && buffer.subarray(0, 5).toString("latin1") === "%PDF-"
}

function isZipBased(buffer: Buffer): boolean {
  // DOCX = arsip ZIP → PK\x03\x04
  return (
    buffer.length > 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04
  )
}

export function assertSafeCvUpload(file: {
  buffer: Buffer
  mimetype: string
  originalname: string
}): void {
  if (!ALLOWED_CV_MIME_TYPES.has(file.mimetype)) {
    throw new HttpError(400, "UNSUPPORTED_FILE", "Format file harus PDF atau DOCX")
  }
  const name = safeOriginalName(file.originalname).toLowerCase()
  const isPdfClaim = file.mimetype === "application/pdf"
  const extOk = isPdfClaim ? name.endsWith(".pdf") : name.endsWith(".docx")
  if (!extOk) {
    throw new HttpError(400, "UNSUPPORTED_FILE", "Ekstensi file tidak sesuai dengan tipenya")
  }
  const contentOk = isPdfClaim ? isPdf(file.buffer) : isZipBased(file.buffer)
  if (!contentOk) {
    throw new HttpError(400, "CORRUPT_FILE", "Isi file tidak sesuai format PDF/DOCX yang valid")
  }
}
