import type { NextFunction, Request, Response } from "express"
import { ZodError } from "zod"
import { logger } from "../lib/logger"

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
  }
}

export const notFound = (id = "resource") =>
  new HttpError(404, "NOT_FOUND", `${id} tidak ditemukan atau bukan milikmu`)

export const quotaExceeded = () =>
  new HttpError(429, "QUOTA_EXCEEDED", "Kuota analisis bulan ini habis")

/** Error handler terpusat — bentuk respons konsisten { error, message }. */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.code, message: err.message })
    return
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "VALIDATION_ERROR",
      message: err.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; "),
    })
    return
  }
  logger.error({ err }, "unhandled error")
  res.status(500).json({ error: "INTERNAL", message: "Terjadi kesalahan internal" })
}
