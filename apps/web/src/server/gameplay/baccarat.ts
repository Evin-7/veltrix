import { createShuffledDeck, handValue, type Card } from "./blackjack";
import { secureRandom, type RandomSource } from "./random";

export const baccaratBetTypes = ["PLAYER", "BANKER", "TIE"] as const;
export type BaccaratBet = (typeof baccaratBetTypes)[number];
export type BaccaratWinner = BaccaratBet;

function baccaratTotal(cards: readonly Card[]) {
  return handValue(cards).total % 10;
}

function shouldBankerDraw(bankerTotal: number, playerThirdValue: number | null) {
  if (playerThirdValue === null) return bankerTotal <= 5;
  if (bankerTotal <= 2) return true;
  if (bankerTotal === 3) return playerThirdValue !== 8;
  if (bankerTotal === 4) return playerThirdValue >= 2 && playerThirdValue <= 7;
  if (bankerTotal === 5) return playerThirdValue >= 4 && playerThirdValue <= 7;
  if (bankerTotal === 6) return playerThirdValue === 6 || playerThirdValue === 7;
  return false;
}

function baccaratCardValue(card: Card) {
  if (card.rank === "A") return 1;
  if (["10", "J", "Q", "K"].includes(card.rank)) return 0;
  return Number(card.rank);
}

function draw(deck: Card[]) {
  const card = deck.shift();
  if (!card) throw new Error("The baccarat shoe is empty.");
  return card;
}

export type BaccaratResult = {
  playerCards: Card[];
  bankerCards: Card[];
  playerTotal: number;
  bankerTotal: number;
  winner: BaccaratWinner;
  bet: BaccaratBet;
  payout: number;
};

export function dealBaccarat(wager: number, bet: BaccaratBet, rng: RandomSource = secureRandom): BaccaratResult {
  const deck = createShuffledDeck(rng);
  const playerCards = [draw(deck), draw(deck)];
  const bankerCards = [draw(deck), draw(deck)];
  let playerTotal = baccaratTotal(playerCards);
  let bankerTotal = baccaratTotal(bankerCards);
  const natural = playerTotal >= 8 || bankerTotal >= 8;
  let playerThirdValue: number | null = null;

  if (!natural && playerTotal <= 5) {
    const third = draw(deck);
    playerCards.push(third);
    playerThirdValue = baccaratCardValue(third);
    playerTotal = baccaratTotal(playerCards);
  }
  if (!natural && shouldBankerDraw(bankerTotal, playerThirdValue)) {
    bankerCards.push(draw(deck));
    bankerTotal = baccaratTotal(bankerCards);
  }

  const winner: BaccaratWinner = playerTotal === bankerTotal ? "TIE" : playerTotal > bankerTotal ? "PLAYER" : "BANKER";
  const payout = winner === bet ? Math.floor(wager * (bet === "TIE" ? 9 : bet === "BANKER" ? 1.95 : 2)) : 0;
  return { playerCards, bankerCards, playerTotal, bankerTotal, winner, bet, payout };
}
