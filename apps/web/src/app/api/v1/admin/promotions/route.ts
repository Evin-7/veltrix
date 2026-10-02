import { createAdminPromotion, listAdminPromotions } from "@/server/admin/phase6";
import { promotionCreateSchema, promotionListSchema } from "@/server/promotions/schemas";
import { adminHandler, adminOptions } from "../_lib";
import { jsonData, jsonDataWithMeta, readJson } from "@/server/http/errors";

export const runtime = "nodejs";

export function OPTIONS(request: Request) { return adminOptions(request); }

export async function GET(request: Request) {
  return adminHandler(request, ["ADMIN", "SUPER_ADMIN"], async () => {
    const result = await listAdminPromotions(promotionListSchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries())));
    return jsonDataWithMeta(result.promotions, result.meta);
  });
}

export async function POST(request: Request) {
  return adminHandler(request, ["ADMIN", "SUPER_ADMIN"], async (user) => jsonData(await createAdminPromotion(user.id, promotionCreateSchema.parse(await readJson(request))), { status: 201 }));
}
