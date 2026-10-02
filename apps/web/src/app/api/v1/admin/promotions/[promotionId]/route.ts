import { updateAdminPromotion } from "@/server/admin/phase6";
import { promotionIdSchema, promotionUpdateSchema } from "@/server/promotions/schemas";
import { adminHandler, adminOptions } from "../../_lib";
import { jsonData, readJson } from "@/server/http/errors";

export const runtime = "nodejs";
type RouteProps = { params: Promise<{ promotionId: string }> };

export function OPTIONS(request: Request) { return adminOptions(request); }

export async function PATCH(request: Request, { params }: RouteProps) {
  return adminHandler(request, ["ADMIN", "SUPER_ADMIN"], async (user) => jsonData(await updateAdminPromotion(user.id, promotionIdSchema.parse((await params).promotionId), promotionUpdateSchema.parse(await readJson(request)))));
}
