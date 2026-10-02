import { setPlayerStatus } from "@/server/admin/service";
import { playerStatusSchema } from "@/server/admin/schemas";
import { adminHandler, adminOptions } from "../../../_lib";
import { jsonData, readJson } from "@/server/http/errors";
import { uuidSchema } from "@/server/users/schemas";

export const runtime = "nodejs";
type RouteProps = { params: Promise<{ playerId: string }> };

export function OPTIONS(request: Request) {
  return adminOptions(request);
}

export async function PATCH(request: Request, { params }: RouteProps) {
  return adminHandler(request, ["ADMIN", "SUPER_ADMIN"], async (user) => jsonData(await setPlayerStatus(user, uuidSchema.parse((await params).playerId), playerStatusSchema.parse(await readJson(request)).status)));
}
