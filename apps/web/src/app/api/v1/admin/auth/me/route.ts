import { jsonData } from "@/server/http/errors";
import { adminHandler, adminOptions } from "../../_lib";

export const runtime = "nodejs";

export function OPTIONS(request: Request) {
  return adminOptions(request);
}

export async function GET(request: Request) {
  return adminHandler(request, ["ADMIN", "SUPER_ADMIN"], async (user) => jsonData(user));
}
