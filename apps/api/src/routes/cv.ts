import { Router } from "express"
import multer from "multer"
import { createCvSchema, updateCvTitleSchema, MAX_CV_CHARS } from "@dilirik/shared"
import { requireAuth } from "../middleware/requireAuth"
import { rateLimit } from "../middleware/rateLimit"
import { HttpError } from "../middleware/errorHandler"
import { extractText } from "../services/extractText"
import { getCvFile, putCvFile, storeCvFile } from "../lib/storage"
import { adobePdfEnabled, convertPdfToDocx } from "../lib/adobePdf"
import { logger } from "../lib/logger"
import * as cvService from "../services/cvService"
import * as previewService from "../services/previewService"

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


import {
  ALLOWED_CV_MIME_TYPES,
  assertSafeCvUpload,
  safeOriginalName,
} from "../lib/uploadSecurity"

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    // Lapis 1: allowlist MIME type. Lapis 2 (magic bytes) dicek setelah buffer ada.
    if (!ALLOWED_CV_MIME_TYPES.has(file.mimetype)) {
      cb(new HttpError(400, "UNSUPPORTED_FILE", "Format file harus PDF atau DOCX"))
      return
    }
    cb(null, true)
  },
})
export const cvRouter: Router = Router()
cvRouter.use(requireAuth)

// List semua CV (dengan versi)
cvRouter.get("/", async (req, res, next) => {
  try {
    res.json({ cvs: await cvService.listCvs(req.userId!) })
  } catch (e) { next(e) }
})

// Tambah CV via paste teks
cvRouter.post("/", rateLimit("cv-create", 10, 60), async (req, res, next) => {
  try {
    const input = createCvSchema.parse(req.body)
    const cv = await cvService.createCv({ userId: req.userId!, ...input } as any)
    res.status(201).json({ cv })
  } catch (e) { next(e) }
})

// Tambah CV via upload PDF/DOCX
cvRouter.post("/upload", rateLimit("cv-upload", 5, 60), upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) throw new HttpError(400, "NO_FILE", "File tidak ditemukan di form-data 'file'")
    // Anti file-spoofing: isi file harus benar-benar PDF/DOCX (magic bytes),
    // bukan sekadar MIME type yang diklaim client.
    assertSafeCvUpload(req.file)
    const originalName = safeOriginalName(req.file.originalname)
    const rawText = await extractText({
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
      originalName,
    })
    if (rawText.length > MAX_CV_CHARS) {
      throw new HttpError(400, "TOO_LONG", `Teks CV melebihi ${MAX_CV_CHARS} karakter`)
    }
    let fileKey = await storeCvFile({
      userId: req.userId!,
      buffer: req.file.buffer,
      contentType: req.file.mimetype,
      originalName,
    })

    // ===== PDF → DOCX (Adobe PDF Services) — pertahankan desain asli =====
    // Konversi hanya 1x per upload; DOCX hasilnya disimpan di `<pdfKey>.docx` dan
    // dijadikan fileKey CV, sehingga SELURUH pipeline revisi DOCX-native yang sudah
    // ada (reviseDocx, preview compare, download Word/PDF) otomatis berlaku juga
    // untuk upload PDF. Best-effort: kalau gagal/kuota habis/fitur mati → fallback
    // ke jalur template seperti sebelumnya, upload TETAP sukses.
    const isPdf =
      req.file.mimetype === "application/pdf" ||
      req.file.originalname.toLowerCase().endsWith(".pdf")
    if (fileKey && isPdf && adobePdfEnabled()) {
      try {
        const docx = await convertPdfToDocx(req.file.buffer)
        const docxKey = `${fileKey}.docx`
        const stored = await putCvFile({ key: docxKey, buffer: docx, contentType: DOCX_MIME })
        if (stored) fileKey = docxKey
      } catch (err) {
        logger.warn({ err }, "Konversi PDF→DOCX gagal — fallback ke jalur template")
      }
    }

    const title = (req.body.title as string | undefined) || req.file.originalname.replace(/\.[^.]+$/, "")
    // const title = (req.body.title as string | undefined) || originalName.replace(/\.[^.]+$/, "")
    const cv = await cvService.createCv({ userId: req.userId!, title, rawText, fileKey })
    // designPreserved: frontend bisa menampilkan badge "desain asli dipertahankan"
    res.status(201).json({ cv, designPreserved: Boolean(fileKey?.toLowerCase().endsWith(".docx")) })
  } catch (e) { next(e) }
})

// Download file desain ASLI (PDF/DOCX yang di-upload, atau DOCX hasil revisi native)
cvRouter.get("/:id/file", async (req, res, next) => {
  try {
    const cv = await cvService.getCv(req.userId!, req.params.id!)
    if (!cv.fileKey) {
      throw new HttpError(404, "NO_FILE", "CV ini tidak punya file desain asli (dibuat via paste teks)")
    }
    const file = await getCvFile(cv.fileKey)
    if (!file) throw new HttpError(404, "NO_FILE", "File tidak ditemukan di storage")
    const ext = cv.fileKey.toLowerCase().endsWith(".docx") ? "docx" : "pdf"
    const slug = cv.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "cv"
    // Content-Type dari allowlist (bukan metadata storage mentah) — anti MIME sniffing/HTML smuggling.
    res.setHeader(
      "Content-Type",
      ext === "docx"
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : "application/pdf",
    )
    res.setHeader("X-Content-Type-Options", "nosniff")
    res.setHeader("Content-Disposition", `attachment; filename="${slug}-v${cv.version}-dilirik.${ext}"`)
    res.send(file.buffer)
  } catch (e) { next(e) }
})

// Download file desain sebagai PDF — PDF asli diteruskan apa adanya, DOCX dikonversi
// via Gotenberg. Hasilnya IDENTIK dengan file Word-nya (bukan render ulang template),
// jadi user bebas memilih format Word atau PDF dengan desain yang sama.
cvRouter.get("/:id/file/pdf", rateLimit("cv-file-pdf", 10, 60), async (req, res, next) => {
  try {
    const id = req.params.id as string
    const cv = await cvService.getCv(req.userId!, id)
    const pdf = await previewService.getOriginalPdfPreview(req.userId!, id)
    const slug = cv.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "cv"
    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("X-Content-Type-Options", "nosniff")
    res.setHeader("Content-Disposition", `attachment; filename="${slug}-v${cv.version}-dilirik.pdf"`)
    res.send(pdf)
  } catch (e) { next(e) }
})

cvRouter.get("/:id", async (req, res, next) => {
  try {
    res.json({ cv: await cvService.getCv(req.userId!, req.params.id!) })
  } catch (e) { next(e) }
})

cvRouter.patch("/:id", async (req, res, next) => {
  try {
    const { title } = updateCvTitleSchema.parse(req.body)
    res.json({ cv: await cvService.updateCvTitle(req.userId!, req.params.id!, title) })
  } catch (e) { next(e) }
})

cvRouter.delete("/:id", async (req, res, next) => {
  try {
    await cvService.deleteCv(req.userId!, req.params.id!)
    res.status(204).end()
  } catch (e) { next(e) }
})

// Compare 2 versi (Flow C)
cvRouter.get("/:id/compare/:otherId", async (req, res, next) => {
  try {
    res.json(await cvService.compareCvVersions(req.userId!, req.params.id!, req.params.otherId!))
  } catch (e) { next(e) }
})
