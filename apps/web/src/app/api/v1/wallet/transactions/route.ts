import { jsonDataWithMeta, jsonError } from "@/server/http/errors";
import { requireAuth } from "@/server/auth/session";
import { requireRole } from "@/server/auth/authorization";
import { walletTransactionQuerySchema } from "@/server/wallet/schemas";
import { listWalletTransactions } from "@/server/wallet/service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = requireRole(await requireAuth(), ["PLAYER"]);
    const query = walletTransactionQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    const result = await listWalletTransactions(user.id, query);
    return jsonDataWithMeta(result.transactions, result.meta);
  } catch (error) {
    return jsonError(error);
  }
}
