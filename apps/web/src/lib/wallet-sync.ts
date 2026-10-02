export const WALLET_UPDATED_EVENT = "veltrix:wallet-updated";

export function emitWalletUpdate(balance: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(WALLET_UPDATED_EVENT, { detail: { balance } }),
  );
}
