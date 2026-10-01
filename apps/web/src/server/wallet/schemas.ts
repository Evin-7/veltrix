import { z } from "zod";
import { walletTransactionTypes } from "./constants";

const pageNumber = z.coerce.number().int().min(1).max(10_000).default(1);
const pageSize = z.coerce.number().int().min(1).max(50).default(10);

export const walletTransactionQuerySchema = z.object({
  type: z.enum(walletTransactionTypes).optional(),
  page: pageNumber,
  pageSize,
});
