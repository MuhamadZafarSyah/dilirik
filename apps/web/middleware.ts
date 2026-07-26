import { NextResponse, type NextRequest } from "next/server"

/**
 * Proteksi route privat (PRD §10): semua /app/* wajib punya session cookie.
 * Dan jika user sudah authenticated (punya session_token) mencoba mengakses /login atau /register,
 * langsung redirect ke /app (Dashboard).
 */
export function middleware(request: NextRequest) {
  const sessionCookie =
    request.cookies.get("better-auth.session_token") ??
    request.cookies.get("__Secure-better-auth.session_token")

  const hasSession = Boolean(sessionCookie?.value)
  const isAuthRoute =
    request.nextUrl.pathname === "/login" ||
    request.nextUrl.pathname === "/register"

  if (hasSession && isAuthRoute) {
    return NextResponse.redirect(new URL("/app", request.url))
  }

  if (!hasSession && request.nextUrl.pathname.startsWith("/app")) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("next", request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = { matcher: ["/app/:path*", "/login", "/register"] }
