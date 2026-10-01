# Phase 4 game engine

VELTRIX gameplay is a server-authoritative portfolio demonstration. VC has no monetary value and the implementation is not an independently certified real-money gaming system.

## Boundaries

```text
HTTP route → auth/origin/Zod/idempotency → gameplay service
  → PostgreSQL transaction and wallet lock → pure game engine
  → round/session/ledger commit → sanitized response
```

The pure engines do not know about Prisma or wallets:

- `slots.ts` generates a 5×3 Neon Relics grid and evaluates five fixed left-to-right paylines.
- `roulette.ts` evaluates a single-zero 0–36 wheel with red, black, odd, even, and single-number bets.
- `blackjack.ts` creates/shuffles a 52-card deck, handles ace values, dealer soft-17 behavior, blackjack, hit, stand, double, bust, push, and settlement states.

Each engine accepts a `RandomSource`. Production uses `crypto.randomInt`, which rejects out-of-range samples instead of applying biased modulo arithmetic. Cards use Fisher–Yates with that source. Tests inject deterministic values or decks, so rule behavior is repeatable. This RNG is suitable for the demo’s server-authoritative behavior, not a certified real-money gambling system.

## Lifecycle

1. The route authenticates a `PLAYER`, checks the same-origin boundary, validates the body, and requires an `Idempotency-Key`.
2. The gameplay service locks the player wallet with PostgreSQL `SELECT ... FOR UPDATE` and checks for an existing action with the same request hash.
3. It creates or reuses an active `GameSession`, creates a `PENDING` `GameRound`, and debits the wager through the existing wallet ledger service.
4. The pure engine generates and evaluates the outcome. Slots and roulette settle immediately. Blackjack persists private active state and settles on blackjack, bust, stand, or double resolution.
5. Positive returns create `GAME_WIN`; losing rounds create no zero-value entry. The round stores payout and net result, session totals are incremented from server values, and recent play is updated.
6. A `GameAction` response snapshot is committed with the round. Repeating the same idempotency key returns that snapshot; using it with a different action or payload is rejected.

`payout` always means total VC returned after the wager was already debited. Therefore a 100 VC red win writes `-100` wager and `+200` win, producing a `+100` round net result. Blackjack natural blackjack returns `250` for a 100 VC wager under the 3:2 rule.

## Recovery and history

Only the current player can read `/api/v1/game-sessions` and its nested round history. The active Blackjack deck is stored in the server-only `GameRound.state`; the recovery endpoint returns a projection without the dealer hole card. Refreshing the table does not create a new wager or deal.

## Deliberate limits

Supported wagers are 10, 25, 50, 100, 250, and 500 VC. Blackjack has no split, insurance, or surrender. Roulette has no outside bet variants beyond red/black/odd/even and single number. Rate limiting remains in-memory for this single-process demo and should move to a shared store before horizontal production scaling.
