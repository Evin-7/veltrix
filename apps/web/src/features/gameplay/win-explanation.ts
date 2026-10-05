import { formatCurrency } from "@/lib/currency";
import { slotCatalogForSlug } from "@/shared/slot-catalog";

export type GameplayKind =
  "slots" | "roulette" | "blackjack" | "baccarat" | "dice" | "arcade";

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

const rouletteSelections: Record<string, string> = {
  RED: "red",
  BLACK: "black",
  ODD: "odd",
  EVEN: "even",
  LOW_18: "1–18",
  HIGH_19: "19–36",
  DOZEN_1_12: "1–12",
  DOZEN_13_24: "13–24",
  DOZEN_25_36: "25–36",
  COLUMN_1: "column 1",
  COLUMN_2: "column 2",
  COLUMN_3: "column 3",
};

/** Explain settled server results without rerunning or guessing the outcome. */
export function explainWin(
  kind: GameplayKind,
  value: unknown,
  gameSlug: string,
): string[] {
  const result = record(value);
  if (
    typeof result.payout !== "number" ||
    result.payout <= 0 ||
    result.status === "ACTIVE"
  )
    return [];

  switch (kind) {
    case "slots": {
      if (!Array.isArray(result.winningLines)) return [];
      const catalog = slotCatalogForSlug(gameSlug);
      return result.winningLines.flatMap((value) => {
        const line = record(value);
        if (
          typeof line.symbol !== "string" ||
          typeof line.count !== "number" ||
          typeof line.line !== "number" ||
          typeof line.multiplier !== "number" ||
          typeof line.payout !== "number"
        )
          return [];
        if (
          catalog &&
          !catalog.symbols.some((symbol) => symbol === line.symbol)
        )
          return [];
        const symbol =
          line.symbol.charAt(0).toUpperCase() + line.symbol.slice(1);
        return [
          `Payline ${line.line}: ${line.count} matching ${symbol} symbols from the left · ${line.multiplier}× · ${formatCurrency(line.payout)} returned.`,
        ];
      });
    }
    case "roulette": {
      const bet = record(result.bet);
      const selection =
        bet.type === "SINGLE_NUMBER"
          ? `number ${bet.number}`
          : rouletteSelections[String(bet.type)];
      if (
        !selection ||
        typeof result.winningNumber !== "number" ||
        typeof result.winningColor !== "string"
      )
        return [];
      const multiplier =
        bet.type === "SINGLE_NUMBER"
          ? 36
          : String(bet.type).startsWith("DOZEN_") ||
              String(bet.type).startsWith("COLUMN_")
            ? 3
            : 2;
      return [
        `The ball landed on ${result.winningNumber} (${result.winningColor.toLowerCase()}), matching your ${selection} bet.`,
        `That selection returns ${multiplier}× your wager, including the original stake.`,
      ];
    }
    case "blackjack":
      if (result.phase === "PLAYER_BLACKJACK")
        return [
          "Your first two cards made 21: a natural blackjack.",
          "Blackjack pays 3:2 profit, plus your original stake. Fractional returns are rounded down.",
        ];
      if (result.phase === "DEALER_BUST")
        return [
          `The dealer went over 21 with ${result.dealerValue}. Your hand of ${result.playerValue} stayed in play.`,
          "Your winning hand returns 2× your total wager, including the stake.",
        ];
      if (result.phase === "PLAYER_WIN")
        return [
          `Your ${result.playerValue} beat the dealer’s ${result.dealerValue} without going over 21.`,
          "Your winning hand returns 2× your total wager, including the stake.",
        ];
      return [];
    case "baccarat":
      if (result.winner !== result.bet) return [];
      if (result.winner === "TIE")
        return [
          `Player and banker both finished on ${result.playerTotal}, matching your tie bet.`,
          "A winning tie bet returns 9× your wager, including the stake.",
        ];
      if (result.winner !== "BANKER" && result.winner !== "PLAYER") return [];
      return [
        `${result.winner === "BANKER" ? "Banker" : "Player"} won ${result.winner === "BANKER" ? result.bankerTotal : result.playerTotal} to ${result.winner === "BANKER" ? result.playerTotal : result.bankerTotal}, matching your bet.`,
        result.winner === "BANKER"
          ? "Banker returns 1.95× your wager after commission, including the stake. Fractional returns are rounded down."
          : "Player returns 2× your wager, including the stake.",
      ];
    case "dice":
      if (
        typeof result.roll !== "number" ||
        (result.bet !== "HIGH" && result.bet !== "LOW")
      )
        return [];
      return [
        `You rolled ${result.roll}, inside your ${result.bet === "HIGH" ? "high range of 51–100" : "low range of 1–49"}.`,
        "A matching roll returns 2× your wager, including the stake.",
      ];
    case "arcade":
      if (typeof result.score !== "number") return [];
      return [
        `Your settled score of ${result.score.toLocaleString("en-US")} reached the ${result.score >= 1700 ? "1,700-point" : "1,250-point"} payout tier.`,
        `Distance ${result.distance} + ${result.tokens} tokens × 30 + ${result.boosts} boosts × 80 = ${result.score.toLocaleString("en-US")} points.`,
        `This tier returns ${result.score >= 1700 ? 3 : 2}× your wager, including the stake.`,
      ];
  }
}
