import { jsonData, jsonError } from "@/server/http/errors";
import { requireAuth } from "@/server/auth/session";

export const runtime = "nodejs";

export async function GET() {
  try {
    return jsonData(await requireAuth());
  } catch (error) {
    return jsonError(error);
  }
}
