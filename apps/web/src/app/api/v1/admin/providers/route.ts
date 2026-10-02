import { createProvider, listAdminGames } from "@/server/admin/service";
import { providerCreateSchema } from "@/server/admin/schemas";
import { adminHandler, adminOptions } from "../_lib";
import { jsonData, readJson } from "@/server/http/errors";

export const runtime = "nodejs";

export function OPTIONS(request: Request) {
  return adminOptions(request);
}

export async function GET(request: Request) {
  return adminHandler(request, ["ADMIN", "SUPER_ADMIN"], async () => jsonData((await listAdminGames()).providers));
}

export async function POST(request: Request) {
  return adminHandler(request, ["ADMIN", "SUPER_ADMIN"], async (user) => {
    const input = providerCreateSchema.parse(await readJson(request));
    return jsonData(await createProvider(user, input), { status: 201 });
  });
}
