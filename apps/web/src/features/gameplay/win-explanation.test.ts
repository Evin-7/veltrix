import { describe, expect, it } from "vitest";
import { explainWin } from "./win-explanation";

describe("win explanations", () => {
  it("explains the actual slot paylines and each payout using the game's symbols", () => {
    expect(
      explainWin(
        "slots",
        {
          payout: 1100,
          winningLines: [
            { line: 2, symbol: "signal", count: 3, multiplier: 3, payout: 300 },
            { line: 5, symbol: "moon", count: 3, multiplier: 8, payout: 800 },
          ],
        },
        "lunar-circuit",
      ),
    ).toEqual([
      "Payline 2: 3 matching Signal symbols from the left · 3× · €300 returned.",
      "Payline 5: 3 matching Moon symbols from the left · 8× · €800 returned.",
    ]);
  });

  it.each([
    ["RED", 3, "RED", "red", "2×"],
    ["SINGLE_NUMBER", 0, "GREEN", "number 0", "36×"],
    ["DOZEN_13_24", 20, "BLACK", "13–24", "3×"],
    ["COLUMN_3", 36, "RED", "column 3", "3×"],
  ])(
    "explains roulette %s without treating gross return as profit",
    (type, winningNumber, winningColor, selection, multiplier) => {
      const reasons = explainWin(
        "roulette",
        {
          payout: 200,
          winningNumber,
          winningColor,
          bet: { type, number: winningNumber },
        },
        "european-roulette",
      );
      expect(reasons[0]).toContain(`matching your ${selection} bet`);
      expect(reasons[1]).toContain(multiplier);
      expect(reasons[1]).toContain("including the original stake");
    },
  );

  it.each([
    ["PLAYER_BLACKJACK", 21, 19, "natural blackjack"],
    ["DEALER_BUST", 16, 24, "over 21 with 24"],
    ["PLAYER_WIN", 20, 18, "Your 20 beat the dealer’s 18"],
  ])(
    "explains blackjack %s from the settled hand",
    (phase, playerValue, dealerValue, reason) => {
      expect(
        explainWin(
          "blackjack",
          { status: "SETTLED", payout: 200, phase, playerValue, dealerValue },
          "midnight-blackjack",
        )[0],
      ).toContain(reason);
    },
  );

  it("does not celebrate blackjack pushes or active hands", () => {
    expect(
      explainWin(
        "blackjack",
        { payout: 100, phase: "PUSH" },
        "midnight-blackjack",
      ),
    ).toEqual([]);
    expect(
      explainWin(
        "blackjack",
        { payout: 200, status: "ACTIVE", phase: "PLAYER_WIN" },
        "midnight-blackjack",
      ),
    ).toEqual([]);
  });

  it("explains baccarat banker commission and the winning totals", () => {
    const reasons = explainWin(
      "baccarat",
      {
        payout: 195,
        bet: "BANKER",
        winner: "BANKER",
        bankerTotal: 8,
        playerTotal: 4,
      },
      "afterglow-baccarat",
    );
    expect(reasons[0]).toContain("Banker won 8 to 4");
    expect(reasons[1]).toContain("1.95×");
    expect(reasons[1]).toContain("commission");
  });

  it("explains a winning baccarat tie instead of calling a hand the winner", () => {
    const reasons = explainWin(
      "baccarat",
      {
        payout: 900,
        bet: "TIE",
        winner: "TIE",
        playerTotal: 7,
        bankerTotal: 7,
      },
      "afterglow-baccarat",
    );
    expect(reasons[0]).toContain("both finished on 7");
    expect(reasons[1]).toContain("9×");
  });

  it.each([
    ["HIGH", 51, "51–100"],
    ["LOW", 49, "1–49"],
  ])("explains dice %s boundaries", (bet, roll, range) => {
    expect(
      explainWin("dice", { payout: 200, bet, roll }, "gilded-dice")[0],
    ).toContain(range);
  });

  it.each([
    [1250, "1,250-point", "2×"],
    [1700, "1,700-point", "3×"],
  ])("explains arcade score tier at %s", (score, tier, multiplier) => {
    const reasons = explainWin(
      "arcade",
      { payout: 200, score, distance: score - 300, tokens: 10, boosts: 0 },
      "neon-paddock",
    );
    expect(reasons[0]).toContain(tier);
    expect(reasons[1]).toContain("10 tokens × 30 + 0 boosts × 80");
    expect(reasons[2]).toContain(multiplier);
  });

  it("does not invent a winning reason for losing or missing outcomes", () => {
    expect(
      explainWin("dice", { payout: 0, roll: 50, bet: "LOW" }, "gilded-dice"),
    ).toEqual([]);
    expect(explainWin("slots", null, "lunar-circuit")).toEqual([]);
    expect(
      explainWin("slots", { payout: 100, winningLines: [{}] }, "lunar-circuit"),
    ).toEqual([]);
  });
});
