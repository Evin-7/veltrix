import { adjustPlayerVc } from "@/server/admin/service";
import { walletAdjustmentSchema } from "@/server/admin/schemas";
import { adminHandler, adminOptions } from "../../_lib";
import { badRequest, jsonData, readJson } from "@/server/http/errors";

export const runtime = "nodejs";

export function OPTIONS(request: Request) {
  return adminOptions(request);
}

export async function POST(request: Request) {
  return adminHandler(request, ["SUPER_ADMIN"], async (user) => {
    const idempotencyKey = request.headers.get("idempotency-key");
    if (!idempotencyKey) throw badRequest("Idempotency-Key header is required.");
    return jsonData(await adjustPlayerVc(user, { ...walletAdjustmentSchema.parse(await readJson(request)), idempotencyKey }));
  });
}
