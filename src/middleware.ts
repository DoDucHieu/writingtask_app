import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readSession, SESSION_COOKIE } from "@/lib/session";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  let signedIn = false;
  if (token) {
    try {
      signedIn = Boolean(await readSession(token));
    } catch {
      signedIn = false;
    }
  }

  const { pathname } = request.nextUrl;
  const isAuthPage = pathname === "/login" || pathname === "/register";

  if (!signedIn && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (signedIn && (isAuthPage || pathname === "/")) {
    return NextResponse.redirect(new URL("/essays", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/register", "/essays", "/practice/:path*", "/summary/:path*"],
};
