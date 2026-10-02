import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  if (process.env.NODE_ENV === "production") {
    const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
    const apiOrigin = (() => {
      try {
        return new URL(process.env.NEXT_PUBLIC_ADMIN_API_URL ?? "http://localhost:3000").origin;
      } catch {
        return "";
      }
    })();
    const contentSecurityPolicy = [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      `connect-src 'self'${apiOrigin ? ` ${apiOrigin}` : ""}`,
      "media-src 'self' blob:",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; ");
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);
    return NextResponse.next({ request: { headers: requestHeaders }, headers: { "Content-Security-Policy": contentSecurityPolicy } });
  }

  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
