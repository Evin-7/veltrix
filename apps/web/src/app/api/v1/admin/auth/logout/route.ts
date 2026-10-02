import { cookies } from "next/headers";
import { clearSessionCookie, revokeSession, SESSION_COOKIE_NAME } from "@/server/auth/session";
import { jsonData } from "@/server/http/errors";
import { adminHandler, adminOptions } from "../../_lib";

export const runtime = "nodejs";

export function OPTIONS(request: Request) {
  return adminOptions(request);
}

export async function POST(request: Request) {
  return adminHandler(request, ["ADMIN", "SUPER_ADMIN"], async () => {
    const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
    await revokeSession(token);
    await clearSessionCookie();
    return jsonData(null);
  });
}
