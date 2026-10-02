import { updateProvider } from "@/server/admin/service";
import { providerUpdateSchema } from "@/server/admin/schemas";
import { adminHandler, adminOptions } from "../../_lib";
import { jsonData, readJson } from "@/server/http/errors";
import { uuidSchema } from "@/server/users/schemas";

export const runtime = "nodejs";
type RouteProps = { params: Promise<{ providerId: string }> };

export function OPTIONS(request: Request) {
  return adminOptions(request);
}

export async function PATCH(request: Request, { params }: RouteProps) {
  return adminHandler(request, ["ADMIN", "SUPER_ADMIN"], async (user) => jsonData(await updateProvider(user, uuidSchema.parse((await params).providerId), providerUpdateSchema.parse(await readJson(request)))));
}
