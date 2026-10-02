import { updateAdminGame } from "@/server/admin/service";
import { gameUpdateSchema } from "@/server/admin/schemas";
import { adminHandler, adminOptions } from "../../_lib";
import { jsonData, readJson } from "@/server/http/errors";
import { uuidSchema } from "@/server/users/schemas";

export const runtime = "nodejs";
type RouteProps = { params: Promise<{ gameId: string }> };

export function OPTIONS(request: Request) {
  return adminOptions(request);
}

export async function PATCH(request: Request, { params }: RouteProps) {
  return adminHandler(request, ["ADMIN", "SUPER_ADMIN"], async (user) => jsonData(await updateAdminGame(user, uuidSchema.parse((await params).gameId), gameUpdateSchema.parse(await readJson(request)))));
}
