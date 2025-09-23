import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Temporarily disable authentication for testing
  // TODO: Re-enable authentication in production

  // Check if user is authenticated
  // const authCookie = request.cookies.get("auth")
  // const isAuthenticated = authCookie?.value === "authenticated"

  // Public paths that don't require authentication
  // const publicPaths = ["/login"]
  // const isPublicPath = publicPaths.some((path) => request.nextUrl.pathname.startsWith(path))

  // If not authenticated and trying to access protected route
  // if (!isAuthenticated && !isPublicPath) {
  //   return NextResponse.redirect(new URL("/login", request.url))
  // }

  // If authenticated and trying to access login page, redirect to dashboard
  // if (isAuthenticated && request.nextUrl.pathname === "/login") {
  //   return NextResponse.redirect(new URL("/dashboard", request.url))
  // }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}
