import { Resend } from "resend"
import { env } from "./env"
import { logger } from "./logger"

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null

async function send(to: string, subject: string, html: string) {
  if (!resend) {
    logger.warn({ to, subject }, "RESEND_API_KEY belum di-set — email dilewati (dev mode)")
    return
  }
  const { data, error } = await resend.emails.send({ from: env.MAIL_FROM, to, subject, html })
  if (error) {
    logger.error({ error, to, subject }, "Gagal kirim email via Resend")
  } else {
    logger.info({ to, subject, id: data?.id }, "Email terkirim via Resend")
  }
}

export async function sendVerificationEmail(to: string, url: string) {
  await send(
    to,
    "Verifikasi email Dilirik kamu",
    `<p>Halo!</p><p>Klik link berikut untuk verifikasi email kamu:</p><p><a href="${url}">Verifikasi email</a></p><p>— Dilirik · Bikin CV-mu dilirik.</p>`,
  )
}

export async function sendResetPasswordEmail(to: string, url: string) {
  await send(
    to,
    "Reset password Dilirik",
    `<p>Ada permintaan reset password.</p><p><a href="${url}">Reset password</a></p><p>Abaikan email ini jika bukan kamu.</p>`,
  )
}
