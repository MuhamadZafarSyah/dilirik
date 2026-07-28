const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

/**
 * Content Security Policy — lapisan utama anti-XSS di sisi web.
 * - script/style 'unsafe-inline' + 'unsafe-eval' masih diperlukan Next.js & framer-motion;
 *   sumber script eksternal dibatasi hanya reCAPTCHA/Turnstile.
 * - connect-src dibatasi ke API Dilirik, provider CAPTCHA, PostHog, dan Gemini Live (mock interview).
 * - worker/blob untuk pdf.js, media/mic untuk live interview.
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${API_URL} https://www.google.com https://challenges.cloudflare.com https://*.posthog.com https://generativelanguage.googleapis.com wss://generativelanguage.googleapis.com`,
  "frame-src https://www.google.com https://challenges.cloudflare.com",
  "worker-src 'self' blob:",
  "media-src 'self' blob: data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ")

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=15552000; includeSubDomains" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
]

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
    ]
  },
}

export default nextConfig
