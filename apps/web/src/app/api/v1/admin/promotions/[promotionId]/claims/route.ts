import { listPromotionClaims } from "@/server/admin/phase6";
import { promotionIdSchema, promotionListSchema } from "@/server/promotions/schemas";
import { adminHandler, adminOptions } from "../../../_lib";
import { jsonDataWithMeta } from "@/server/http/errors";

export const runtime = "nodejs";
type RouteProps = { params: Promise<{ promotionId: string }> };

export function OPTIONS(request: Request) { return adminOptions(request); }

export async function GET(request: Request, { params }: RouteProps) {
  return adminHandler(request, ["ADMIN", "SUPER_ADMIN"], async () => {
    const result = await listPromotionClaims(promotionIdSchema.parse((await params).promotionId), promotionListSchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries())));
    return jsonDataWithMeta(result.claims, result.meta);
  });
}
