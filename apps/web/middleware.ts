import { NextResponse, type NextRequest } from "next/server"

/**
 * Proteksi route privat (PRD §10): semua /app/* wajib punya session cookie.
 * Verifikasi penuh tetap di API (requireAuth) — ini lapisan UX redirect cepat.
 */
export function middleware(request: NextRequest) {
  const sessionCookie =
    request.cookies.get("better-auth.session_token") ??
    request.cookies.get("__Secure-better-auth.session_token")
  if (!sessionCookie?.value) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("next", request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }
  return NextResponse.next()
}

export const config = { matcher: ["/app/:path*"] }
