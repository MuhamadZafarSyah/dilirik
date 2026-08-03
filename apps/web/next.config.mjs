const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/**
 * Content Security Policy — lapisan utama anti-XSS di sisi web.
 * - script/style 'unsafe-inline' + 'unsafe-eval' masih diperlukan Next.js & framer-motion;
 *   sumber script eksternal dibatasi hanya reCAPTCHA/Turnstile, Google Tag Manager (GA4), dan PostHog.
 * - connect-src dibatasi ke API Dilirik, provider CAPTCHA, PostHog, endpoint Google Analytics,
 *   dan Gemini Live (mock interview).
 * - worker/blob untuk pdf.js, media/mic untuk live interview.
 *
 * PERINGATAN: tanpa entri googletagmanager di script-src dan google-analytics di
 * connect-src, GA4 diblokir SEPENUHNYA oleh browser tanpa error apa pun di sisi
 * server — dashboard hanya tampak kosong. Jangan hapus entri itu selama GA dipakai.
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com https://challenges.cloudflare.com https://www.googletagmanager.com https://*.posthog.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' blob: ${API_URL} https://www.google.com https://challenges.cloudflare.com https://*.posthog.com https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://generativelanguage.googleapis.com wss://generativelanguage.googleapis.com`,
  "worker-src 'self' blob:",
  "media-src 'self' blob: data:",
  "object-src 'self' blob:",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "frame-src 'self' blob: https://www.google.com https://challenges.cloudflare.com",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(self), geolocation=(), payment=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=15552000; includeSubDomains",
  },
  // 'on': izinkan browser meresolusi DNS domain pihak ketiga (fonts, GA, PostHog)
  // lebih awal. Menghemat puluhan hingga ratusan milidetik pada koneksi seluler.
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@dilirik/shared"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/array/:path*",
        destination: "https://us-assets.i.posthog.com/array/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },
  // Required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
