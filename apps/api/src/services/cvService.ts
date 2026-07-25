import { prisma } from "@dilirik/db"
import { parseCv } from "@dilirik/ai"
import { cvStructuredSchema, type CvStructured } from "@dilirik/shared"
import { notFound } from "../middleware/errorHandler"
import { detectLanguage } from "./detectLanguage"

/** Buat CV baru dari teks (paste ATAU hasil ekstraksi upload). */
export async function createCv(args: {
  userId: string
  title: string
  rawText: string
  fileKey?: string | null
}) {
  const language = detectLanguage(args.rawText)
  const structured = await parseCv(args.rawText)
  return prisma.cv.create({
    data: {
      userId: args.userId,
      title: args.title,
      rawText: args.rawText,
      language,
      structuredJson: structured,
      fileKey: args.fileKey ?? null,
      version: 1,
    },
  })
}

/** List semua CV milik user, tergrup root + versi. */
export async function listCvs(userId: string) {
  return prisma.cv.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true, title: true, language: true, version: true, parentCvId: true,
      createdAt: true, updatedAt: true,
    },
  })
}

export async function getCv(userId: string, cvId: string) {
  const cv = await prisma.cv.findFirst({ where: { id: cvId, userId } })
  if (!cv) throw notFound("CV")
  return cv
}

export async function updateCvTitle(userId: string, cvId: string, title: string) {
  await getCv(userId, cvId) // ownership check
  return prisma.cv.update({ where: { id: cvId }, data: { title } })
}

/** Set fileKey (file desain asli hasil revisi DOCX native) pada sebuah versi CV. */
export async function setCvFileKey(userId: string, cvId: string, fileKey: string) {
  await getCv(userId, cvId) // ownership check
  return prisma.cv.update({ where: { id: cvId }, data: { fileKey } })
}

/** Hapus manual (PRD §12 Privasi) — versi lain TIDAK ikut terhapus (SetNull). */
export async function deleteCv(userId: string, cvId: string) {
  await getCv(userId, cvId)
  await prisma.cv.delete({ where: { id: cvId } })
}

/**
 * Buat VERSI BARU dari CV (Flow C — terapkan saran).
 * Versi lama tidak disentuh sama sekali → bisa di-compare.
 */
export async function createCvVersion(args: {
  userId: string
  sourceCvId: string
  newRawText: string
  structured?: CvStructured
}) {
  const source = await getCv(args.userId, args.sourceCvId)
  const rootId = source.parentCvId ?? source.id
  const latest = await prisma.cv.aggregate({
    where: { userId: args.userId, OR: [{ id: rootId }, { parentCvId: rootId }] },
    _max: { version: true },
  })
  const structured = args.structured ?? (await parseCv(args.newRawText))
  return prisma.cv.create({
    data: {
      userId: args.userId,
      title: source.title,
      rawText: args.newRawText,
      language: detectLanguage(args.newRawText),
      structuredJson: cvStructuredSchema.parse(structured),
      parentCvId: rootId,
      version: (latest._max.version ?? source.version) + 1,
    },
  })
}

/** Ambil 2 versi untuk halaman compare (before/after). */
export async function compareCvVersions(userId: string, cvIdA: string, cvIdB: string) {
  const [a, b] = await Promise.all([getCv(userId, cvIdA), getCv(userId, cvIdB)])
  return { before: a.version <= b.version ? a : b, after: a.version <= b.version ? b : a }
}
