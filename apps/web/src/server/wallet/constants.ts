export const walletTransactionTypes = ["WELCOME_BONUS", "DAILY_REWARD", "GAME_WAGER", "GAME_WIN", "ADMIN_ADJUSTMENT"] as const;
export type WalletTransactionTypeValue = (typeof walletTransactionTypes)[number];
