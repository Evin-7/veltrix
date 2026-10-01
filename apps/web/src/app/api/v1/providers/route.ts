import { jsonData, jsonError } from "@/server/http/errors";
import { listPublicProviders } from "@/server/games/service";

export const runtime = "nodejs";

export async function GET() {
  try {
    return jsonData(await listPublicProviders());
  } catch (error) {
    return jsonError(error);
  }
}
