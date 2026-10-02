import { NextResponse, type NextRequest } from "next/server";

const requestIdPattern = /^[A-Za-z0-9._:-]{1,128}$/;

export function proxy(request: NextRequest) {
  const supplied = request.headers.get("x-request-id");
  const requestId = supplied && requestIdPattern.test(supplied) ? supplied : crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("x-request-id", requestId);
  return response;
}

export const config = { matcher: ["/api/:path*"] };
