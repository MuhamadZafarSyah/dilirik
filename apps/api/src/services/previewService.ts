import { HttpError } from "../middleware/errorHandler"
import { getCvFile } from "../lib/storage"
import { convertDocxToPdf, gotenbergEnabled } from "../lib/gotenberg"
import { reviseDocx, type DocxReplacement } from "./docxRevise"
import * as cvService from "./cvService"

/**
 * Preview desain (iLovePDF-style compare):
 * - "Before": file asli user — PDF diteruskan apa adanya, DOCX dikonversi ke PDF.
 *   Khusus CV hasil konversi Adobe (fileKey `*.pdf.docx`), "Before" memakai PDF
 *   ASLI yang tersimpan di sebelahnya (key tanpa sufiks `.docx`) — pixel-perfect.
 * - "After": DOCX asli dipatch in-memory dengan engine reviseDocx (hanya isi <w:t>
 *   yang diganti — styling, font, dan tabel tidak disentuh) lalu dikonversi ke PDF.
 *
 * PENTING: fungsi-fungsi ini murni preview — TIDAK menyimpan file/versi apa pun.
 * Sumber kebenaran tetap rawText + flow apply yang sudah ada di routes/analyze.ts.
 */

function convertError(): HttpError {
  return new HttpError(502, "PREVIEW_CONVERT_FAILED", "Konversi desain ke PDF gagal — coba lagi sebentar")
}

function disabledError(): HttpError {
  return new HttpError(503, "PREVIEW_UNAVAILABLE", "Preview desain belum aktif — GOTENBERG_URL belum dikonfigurasi")
}

/** PDF preview file desain ASLI milik CV (ownership dicek via cvService.getCv). */
export async function getOriginalPdfPreview(userId: string, cvId: string): Promise<Buffer> {
  const cv = await cvService.getCv(userId, cvId)
  if (!cv.fileKey) {
    throw new HttpError(404, "NO_FILE", "CV ini tidak punya file desain asli (dibuat via paste teks)")
  }
  // CV dari upload PDF yang dikonversi Adobe: PDF asli ada di key tanpa ".docx".
  // Best-effort — kalau PDF aslinya tidak ada, jatuh ke konversi DOCX di bawah.
  if (cv.fileKey.toLowerCase().endsWith(".pdf.docx")) {
    try {
      const original = await getCvFile(cv.fileKey.slice(0, -".docx".length))
      if (original) return original.buffer
    } catch {
      // PDF asli hilang dari storage — lanjut pakai DOCX hasil konversi
    }
  }
  const file = await getCvFile(cv.fileKey)
  if (!file) throw new HttpError(404, "NO_FILE", "File tidak ditemukan di storage")
  if (!cv.fileKey.toLowerCase().endsWith(".docx")) return file.buffer // sudah PDF — passthrough
  if (!gotenbergEnabled()) throw disabledError()
  try {
    return await convertDocxToPdf(file.buffer, "cv.docx")
  } catch {
    throw convertError()
  }
}

/** PDF preview hasil revisi: patch DOCX in-memory → konversi. Tidak menyimpan apa pun. */
export async function getRevisedPdfPreview(
  userId: string,
  cvId: string,
  replacements: DocxReplacement[],
): Promise<{ pdf: Buffer; appliedCount: number; skippedCount: number }> {
  const cv = await cvService.getCv(userId, cvId)
  if (!cv.fileKey?.toLowerCase().endsWith(".docx")) {
    throw new HttpError(400, "NOT_DOCX", "Preview revisi desain hanya tersedia untuk CV sumber .docx")
  }
  if (!gotenbergEnabled()) throw disabledError()
  const file = await getCvFile(cv.fileKey)
  if (!file) throw new HttpError(404, "NO_FILE", "File tidak ditemukan di storage")

  const revised = await reviseDocx({ buffer: file.buffer, replacements })
  let pdf: Buffer
  try {
    pdf = await convertDocxToPdf(revised.buffer, "cv-revisi.docx")
  } catch {
    throw convertError()
  }
  return { pdf, appliedCount: revised.applied.length, skippedCount: revised.skipped.length }
}
