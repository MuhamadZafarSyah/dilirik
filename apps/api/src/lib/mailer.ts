import { Resend } from "resend";
import { env } from "./env";
import { logger } from "./logger";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

async function send(to: string, subject: string, html: string) {
  if (!resend) {
    logger.warn(
      { to, subject },
      "RESEND_API_KEY belum di-set — email dilewati (dev mode)",
    );
    return;
  }
  const { data, error } = await resend.emails.send({
    from: env.MAIL_FROM,
    to,
    subject,
    html,
  });
  if (error) {
    logger.error({ error, to, subject }, "Gagal kirim email via Resend");
  } else {
    logger.info({ to, subject, id: data?.id }, "Email terkirim via Resend");
  }
}

function getEmailTemplate(
  title: string,
  contentHtml: string,
  actionUrl?: string,
  actionText?: string,
) {
  const buttonHtml =
    actionUrl && actionText
      ? `
    <div style="margin: 28px 0; text-align: center;">
      <a href="${actionUrl}" style="display: inline-block; padding: 14px 32px; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 700; color: #fbf6ea; background-color: #3f6fb0; border: 2px solid #2a241d; text-decoration: none; border-radius: 8px; box-shadow: 4px 4px 0px #2a241d;">
        ${actionText}
      </a>
    </div>
  `
      : "";

  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f2e8d5; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f2e8d5; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #fbf6ea; border: 2px solid #2a241d; border-radius: 12px; box-shadow: 6px 6px 0px #2a241d; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 24px; border-bottom: 2px dashed #d8c9ad; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: #2a241d; letter-spacing: -0.5px;">Dilirik</h1>
              <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 500; color: #7a6f5e;">Bikin CV-mu dilirik.</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px 24px 24px 24px;">
              ${contentHtml}
              ${buttonHtml}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px; background-color: #f6efe0; border-top: 2px solid #2a241d; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #7a6f5e; line-height: 1.6;">
                Email ini dikirim otomatis oleh <strong>Dilirik</strong>.
              </p>
              <p style="margin: 12px 0 0 0; font-size: 11px; color: #a39580;">
                © 2026 Dilirik. Semua Hak Cipta Dilindungi.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export async function sendVerificationEmail(to: string, url: string) {
  const contentHtml = `
    <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #2a241d;">Halo! 👋</h2>
    <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #2a241d;">
      Terima kasih telah mendaftar di <strong>Dilirik</strong>. Silakan klik tombol di bawah ini untuk memverifikasi alamat email Anda dan mengaktifkan akun Anda:
    </p>
    <p style="margin: 24px 0 0 0; font-size: 13px; line-height: 1.5; color: #7a6f5e;">
      Jika tombol di atas tidak berfungsi, silakan klik atau salin tautan berikut ke browser Anda:<br>
      <a href="${url}" style="color: #3f6fb0; text-decoration: underline; word-break: break-all;">${url}</a>
    </p>
  `;

  await send(
    to,
    "Verifikasi email Dilirik kamu",
    getEmailTemplate(
      "Verifikasi email Dilirik kamu",
      contentHtml,
      url,
      "Verifikasi Email",
    ),
  );
}

export async function sendResetPasswordEmail(to: string, url: string) {
  const contentHtml = `
    <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #2a241d;">Halo! 👋</h2>
    <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #2a241d;">
      Kami menerima permintaan untuk mereset kata sandi akun Dilirik Anda. Silakan klik tombol di bawah ini untuk membuat kata sandi baru:
    </p>
    <p style="margin: 24px 0 0 0; font-size: 13px; line-height: 1.5; color: #7a6f5e;">
      Jika tombol di atas tidak berfungsi, silakan klik atau salin tautan berikut ke browser Anda:<br>
      <a href="${url}" style="color: #3f6fb0; text-decoration: underline; word-break: break-all;">${url}</a>
    </p>
    <p style="margin: 16px 0 0 0; font-size: 13px; line-height: 1.5; color: #7a6f5e; border-top: 1px solid #d8c9ad; padding-top: 12px;">
      Abaikan email ini jika Anda tidak meminta perubahan kata sandi. Kata sandi Anda akan tetap aman dan tidak berubah.
    </p>
  `;

  await send(
    to,
    "Reset password Dilirik",
    getEmailTemplate(
      "Reset password Dilirik",
      contentHtml,
      url,
      "Reset Kata Sandi",
    ),
  );
}
