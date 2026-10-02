import { requestJson } from "@/lib/api-client";

export async function readAuthoritativeWalletBalance() {
  const result = await requestJson<{ balance?: unknown }>("/api/v1/wallet", { cache: "no-store" });
  const balance = result.balance;
  if (typeof balance !== "number" || !Number.isSafeInteger(balance) || balance < 0) {
    throw new Error("The wallet response was invalid.");
  }
  return balance;
}
