import { describe, expect, it } from "vitest";
import { doubleBlackjack, handValue, payoutForBlackjack, resolveDealer, type BlackjackState } from "./blackjack";

const card = (rank: BlackjackState["playerCards"][number]["rank"], suit: BlackjackState["playerCards"][number]["suit"] = "spades") => ({ rank, suit });

describe("Veltrix Blackjack rules", () => {
  it("handles aces as eleven when possible and one otherwise", () => {
    expect(handValue([card("A"), card("K")])).toMatchObject({ total: 21, soft: true });
    expect(handValue([card("A"), card("9"), card("5")])).toMatchObject({ total: 15, soft: false });
  });

  it("stands on soft 17", () => {
    const state: BlackjackState = { deck: [card("K")], playerCards: [card("A"), card("6")], dealerCards: [card("A"), card("6")], wager: 100, doubled: false, phase: "PLAYER_TURN" };
    const resolved = resolveDealer(state);
    expect(resolved.dealerCards).toHaveLength(2);
    expect(resolved.phase).toBe("PUSH");
  });

  it("requires an initial two-card hand for double", () => {
    const state: BlackjackState = { deck: [card("5")], playerCards: [card("9"), card("2")], dealerCards: [card("10"), card("K")], wager: 100, doubled: false, phase: "PLAYER_TURN" };
    expect(doubleBlackjack(state).wager).toBe(200);
  });

  it("uses total-return payout semantics", () => {
    const natural: BlackjackState = { deck: [], playerCards: [card("A"), card("K")], dealerCards: [card("9"), card("7")], wager: 100, doubled: false, phase: "PLAYER_BLACKJACK" };
    expect(payoutForBlackjack(natural, 100)).toBe(250);
  });

  it("keeps odd VC natural returns integer-only", () => {
    const natural: BlackjackState = { deck: [], playerCards: [card("A"), card("K")], dealerCards: [card("9"), card("7")], wager: 25, doubled: false, phase: "PLAYER_BLACKJACK" };
    expect(payoutForBlackjack(natural, 25)).toBe(62);
    expect(Number.isSafeInteger(payoutForBlackjack(natural, 25))).toBe(true);
  });
});
