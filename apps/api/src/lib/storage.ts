import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { randomUUID } from "node:crypto"
import { env } from "./env"

/** Cloudflare R2 via S3-compatible API. */
function getClient(): S3Client | null {
  if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) return null
  return new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  })
}

/** Simpan file CV asli ke R2; return key (atau null jika R2 belum dikonfigurasi — teks tetap diproses). */
export async function storeCvFile(args: {
  userId: string
  buffer: Buffer
  contentType: string
  originalName: string
}): Promise<string | null> {
  const client = getClient()
  if (!client) return null
  const key = `cv/${args.userId}/${randomUUID()}-${args.originalName.replace(/[^\w.-]/g, "_")}`
  await client.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: key,
      Body: args.buffer,
      ContentType: args.contentType,
    }),
  )
  return key
}

/** Ambil file CV dari R2 (untuk download desain asli & revisi DOCX native). */
export async function getCvFile(
  key: string,
): Promise<{ buffer: Buffer; contentType?: string } | null> {
  const client = getClient()
  if (!client) return null
  const res = await client.send(new GetObjectCommand({ Bucket: env.R2_BUCKET, Key: key }))
  const bytes = await res.Body?.transformToByteArray()
  if (!bytes) return null
  return { buffer: Buffer.from(bytes), contentType: res.ContentType }
}
