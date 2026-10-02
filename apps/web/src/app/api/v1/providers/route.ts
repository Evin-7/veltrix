import { jsonData, jsonError } from "@/server/http/errors";
import { listPublicProviders } from "@/server/games/service";

export const runtime = "nodejs";
const publicCache = { headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600" } };

export async function GET() {
  try {
    return jsonData(await listPublicProviders(), publicCache);
  } catch (error) {
    return jsonError(error);
  }
}
