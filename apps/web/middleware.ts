import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "./lib/session";

/**
 * Basic authentication gate:
 *  - `/api/*`  → 401 JSON for unauthenticated requests (auth endpoints excluded)
 *  - `/login`  → bounce signed-in users back to the marketplace
 *  - everything else matched → redirect to /login, preserving the intended destination
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const user = token ? await verifySessionToken(token) : null;

  if (pathname.startsWith("/api")) {
    if (pathname.startsWith("/api/auth")) return NextResponse.next();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    return NextResponse.next();
  }

  if (pathname === "/login") {
    if (user) return NextResponse.redirect(new URL("/", request.url));
    return NextResponse.next();
  }

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/api/:path*"],
};