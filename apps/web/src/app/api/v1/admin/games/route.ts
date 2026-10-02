import { createAdminGame, listAdminGames } from "@/server/admin/service";
import { gameCreateSchema } from "@/server/admin/schemas";
import { adminHandler, adminOptions } from "../_lib";
import { jsonData, readJson } from "@/server/http/errors";

export const runtime = "nodejs";

export function OPTIONS(request: Request) {
  return adminOptions(request);
}

export async function GET(request: Request) {
  return adminHandler(request, ["ADMIN", "SUPER_ADMIN"], async () => jsonData(await listAdminGames()));
}

export async function POST(request: Request) {
  return adminHandler(request, ["ADMIN", "SUPER_ADMIN"], async (user) => {
    const input = gameCreateSchema.parse(await readJson(request));
    return jsonData(await createAdminGame(user, { name: input.name, slug: input.slug, description: input.description, category: input.category, thumbnail: input.thumbnail, status: input.status, featured: input.featured, newGame: input.newGame, popular: input.popular, demoRtp: input.demoRtp, provider: { connect: { id: input.providerId } } }), { status: 201 });
  });
}
