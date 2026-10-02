export const walletTransactionTypes = ["WELCOME_BONUS", "DAILY_REWARD", "GAME_WAGER", "GAME_WIN", "ADMIN_ADJUSTMENT", "PROMOTION_REWARD", "VIP_REWARD"] as const;
export type WalletTransactionTypeValue = (typeof walletTransactionTypes)[number];
