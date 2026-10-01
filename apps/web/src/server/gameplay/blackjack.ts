import { secureRandom, shuffle, type RandomSource } from "./random";

export const blackjackRanks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"] as const;
export const blackjackSuits = ["clubs", "diamonds", "hearts", "spades"] as const;
export type BlackjackRank = (typeof blackjackRanks)[number];
export type BlackjackSuit = (typeof blackjackSuits)[number];
export type Card = { rank: BlackjackRank; suit: BlackjackSuit };
export type BlackjackPhase = "PLAYER_TURN" | "PLAYER_BUST" | "DEALER_BUST" | "PLAYER_WIN" | "DEALER_WIN" | "PUSH" | "PLAYER_BLACKJACK" | "SETTLED";

export type BlackjackState = {
  deck: Card[];
  playerCards: Card[];
  dealerCards: Card[];
  wager: number;
  doubled: boolean;
  phase: BlackjackPhase | "PLAYER_TURN";
};

export function cardValue(card: Card) {
  if (card.rank === "A") return 11;
  if (["K", "Q", "J"].includes(card.rank)) return 10;
  return Number(card.rank);
}

export function handValue(cards: readonly Card[]) {
  let total = cards.reduce((sum, card) => sum + cardValue(card), 0);
  let aces = cards.filter((card) => card.rank === "A").length;
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return { total, soft: aces > 0 };
}

export function isNatural(cards: readonly Card[]) {
  return cards.length === 2 && handValue(cards).total === 21;
}

export function createDeck(): Card[] {
  return blackjackSuits.flatMap((suit) => blackjackRanks.map((rank) => ({ rank, suit })));
}

export function createShuffledDeck(rng: RandomSource = secureRandom) {
  return shuffle(createDeck(), rng);
}

export function dealBlackjack(wager: number, rng: RandomSource = secureRandom) {
  const deck = createShuffledDeck(rng);
  const playerCards = [deck[0], deck[2]];
  const dealerCards = [deck[1], deck[3]];
  const remaining = deck.slice(4);
  const playerNatural = isNatural(playerCards);
  const dealerNatural = isNatural(dealerCards);
  const state: BlackjackState = { deck: remaining, playerCards, dealerCards, wager, doubled: false, phase: "PLAYER_TURN" };
  if (dealerNatural || playerNatural) {
    state.phase = dealerNatural && playerNatural ? "PUSH" : dealerNatural ? "DEALER_WIN" : "PLAYER_BLACKJACK";
  }
  return state;
}

export function drawCard(state: BlackjackState): BlackjackState {
  const [card, ...deck] = state.deck;
  if (!card) throw new Error("The blackjack deck is empty.");
  return { ...state, deck, playerCards: [...state.playerCards, card] };
}

export function resolveDealer(state: BlackjackState): BlackjackState {
  let current = state;
  while (handValue(current.dealerCards).total < 17) {
    const [card, ...deck] = current.deck;
    if (!card) throw new Error("The blackjack deck is empty.");
    current = { ...current, deck, dealerCards: [...current.dealerCards, card] };
  }
  const player = handValue(current.playerCards).total;
  const dealer = handValue(current.dealerCards).total;
  const phase = dealer > 21 ? "DEALER_BUST" : player > dealer ? "PLAYER_WIN" : player < dealer ? "DEALER_WIN" : "PUSH";
  return { ...current, phase };
}

export function hitBlackjack(state: BlackjackState) {
  if (state.phase !== "PLAYER_TURN") throw new Error("The hand is not accepting a hit.");
  const next = drawCard(state);
  if (handValue(next.playerCards).total > 21) return { ...next, phase: "PLAYER_BUST" as const };
  if (handValue(next.playerCards).total === 21) return resolveDealer(next);
  return next;
}

export function standBlackjack(state: BlackjackState) {
  if (state.phase !== "PLAYER_TURN") throw new Error("The hand is not accepting a stand.");
  return resolveDealer(state);
}

export function doubleBlackjack(state: BlackjackState) {
  if (state.phase !== "PLAYER_TURN" || state.playerCards.length !== 2 || state.doubled) throw new Error("Double is only available on the initial two-card hand.");
  const next = drawCard({ ...state, wager: state.wager * 2, doubled: true });
  if (handValue(next.playerCards).total > 21) return { ...next, phase: "PLAYER_BUST" as const };
  return resolveDealer(next);
}

export function payoutForBlackjack(state: BlackjackState, originalWager: number) {
  if (state.phase === "PLAYER_BLACKJACK") return originalWager * 5 / 2;
  if (state.phase === "PUSH") return state.wager;
  if (state.phase === "PLAYER_WIN" || state.phase === "DEALER_BUST") return state.wager * 2;
  return 0;
}

export function publicBlackjackState(state: BlackjackState) {
  const active = state.phase === "PLAYER_TURN";
  return {
    playerCards: state.playerCards,
    dealerCards: active ? [state.dealerCards[0]] : state.dealerCards,
    playerValue: handValue(state.playerCards).total,
    dealerValue: active ? handValue([state.dealerCards[0]]).total : handValue(state.dealerCards).total,
    phase: state.phase,
    wager: state.wager,
    doubled: state.doubled,
    canHit: active,
    canStand: active,
    canDouble: active && state.playerCards.length === 2 && !state.doubled,
  };
}
