import { NextRequest, NextResponse } from "next/server";

const MOBILE_UA = /Mobile|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i;

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/web") || pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const ua = req.headers.get("user-agent") || "";
  if (MOBILE_UA.test(ua)) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = pathname === "/" ? "/web" : `/web${pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!api|_next|favicon.ico|.*\\..*).*)"],
};
