import { getDashboard } from "@/server/admin/service";
import { adminHandler, adminOptions } from "../_lib";
import { jsonData } from "@/server/http/errors";
import { z } from "zod";

export const runtime = "nodejs";
const rangeSchema = z.enum(["24h", "7d", "30d"]).default("7d");

export function OPTIONS(request: Request) {
  return adminOptions(request);
}

export async function GET(request: Request) {
  return adminHandler(request, ["ADMIN", "SUPER_ADMIN"], async () => jsonData(await getDashboard(rangeSchema.parse(new URL(request.url).searchParams.get("range") ?? undefined))));
}
