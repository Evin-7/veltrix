import { getPlayer } from "@/server/admin/service";
import { uuidSchema } from "@/server/users/schemas";
import { adminHandler, adminOptions } from "../../_lib";
import { jsonData } from "@/server/http/errors";

export const runtime = "nodejs";
type RouteProps = { params: Promise<{ playerId: string }> };

export function OPTIONS(request: Request) {
  return adminOptions(request);
}

export async function GET(request: Request, { params }: RouteProps) {
  return adminHandler(request, ["ADMIN", "SUPER_ADMIN"], async () => jsonData(await getPlayer(uuidSchema.parse((await params).playerId))));
}
