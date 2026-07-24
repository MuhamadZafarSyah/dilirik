import { Router } from "express"
import multer from "multer"
import { createCvSchema, updateCvTitleSchema, MAX_CV_CHARS } from "@dilirik/shared"
import { requireAuth } from "../middleware/requireAuth"
import { rateLimit } from "../middleware/rateLimit"
import { HttpError } from "../middleware/errorHandler"
import { extractText } from "../services/extractText"
import { storeCvFile } from "../lib/storage"
import * as cvService from "../services/cvService"

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })
export const cvRouter = Router()
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
    const cv = await cvService.createCv({ userId: req.userId!, ...input })
    res.status(201).json({ cv })
  } catch (e) { next(e) }
})

// Tambah CV via upload PDF/DOCX
cvRouter.post("/upload", rateLimit("cv-upload", 5, 60), upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) throw new HttpError(400, "NO_FILE", "File tidak ditemukan di form-data 'file'")
    const rawText = await extractText({
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
      originalName: req.file.originalname,
    })
    if (rawText.length > MAX_CV_CHARS) {
      throw new HttpError(400, "TOO_LONG", `Teks CV melebihi ${MAX_CV_CHARS} karakter`)
    }
    const fileKey = await storeCvFile({
      userId: req.userId!,
      buffer: req.file.buffer,
      contentType: req.file.mimetype,
      originalName: req.file.originalname,
    })
    const title = (req.body.title as string | undefined) || req.file.originalname.replace(/\.[^.]+$/, "")
    const cv = await cvService.createCv({ userId: req.userId!, title, rawText, fileKey })
    res.status(201).json({ cv })
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
