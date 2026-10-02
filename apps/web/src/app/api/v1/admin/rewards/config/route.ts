import { listAdminVipConfig, updateAdminVipConfig } from "@/server/admin/phase6";
import { vipConfigSchema } from "@/server/admin/schemas";
import { adminHandler, adminOptions } from "../../_lib";
import { jsonData, readJson } from "@/server/http/errors";

export const runtime = "nodejs";

export function OPTIONS(request: Request) { return adminOptions(request); }

export async function GET(request: Request) { return adminHandler(request, ["ADMIN", "SUPER_ADMIN"], async () => jsonData(await listAdminVipConfig())); }

export async function PATCH(request: Request) {
  return adminHandler(request, ["SUPER_ADMIN"], async (user) => {
    const input = vipConfigSchema.parse(await readJson(request));
    return jsonData(await updateAdminVipConfig(user.id, input.level, { xpThreshold: input.xpThreshold, rewardVC: input.rewardVC }));
  });
}
