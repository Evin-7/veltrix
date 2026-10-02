import { listAdminRewardHistory } from "@/server/admin/phase6";
import { adminListSchema } from "@/server/admin/schemas";
import { adminHandler, adminOptions } from "../../_lib";
import { jsonDataWithMeta } from "@/server/http/errors";

export const runtime = "nodejs";

export function OPTIONS(request: Request) { return adminOptions(request); }

export async function GET(request: Request) {
  return adminHandler(request, ["ADMIN", "SUPER_ADMIN"], async () => {
    const result = await listAdminRewardHistory(adminListSchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries())));
    return jsonDataWithMeta(result.history, result.meta);
  });
}
