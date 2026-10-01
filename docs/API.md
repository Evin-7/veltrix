# API

Base path: `/api/v1`

Successful responses use a data envelope:

```json
{ "data": {} }
```

Paginated game responses add `meta`:

```json
{ "data": [], "meta": { "page": 1, "pageSize": 24, "total": 12, "totalPages": 1 } }
```

Errors use:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Invalid request.", "details": {} } }
```

## Auth

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/auth/register` | Public | Create a PLAYER, profile, session, and cookie |
| POST | `/auth/login` | Public | Validate credentials and rotate a session |
| POST | `/auth/logout` | Cookie | Revoke the current session and clear cookie |
| GET | `/auth/me` | Required | Return safe current-user data |

Register body:

```json
{ "email": "player@example.com", "username": "orbit_player", "password": "at-least-12-characters" }
```

Login body:

```json
{ "email": "player@example.com", "password": "at-least-12-characters" }
```

## Users

`GET /users/me` requires a valid session and returns the same safe user shape as `/auth/me`.

`PATCH /users/me` requires a valid session and accepts only `displayName` and/or `avatarUrl`. Role, status, email, wallet balance, arbitrary properties, and client timestamps are rejected.

## Wallet and rewards

All wallet endpoints require an authenticated `PLAYER`. Amounts and transaction types are selected by server code; the client cannot submit a credit amount.

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/wallet` | PLAYER | Return `{ balance, currency: "VC" }` |
| GET | `/wallet/transactions` | PLAYER | Paginated, newest-first ledger view |
| GET | `/rewards/daily` | PLAYER | Return daily reward availability and next UTC eligibility |
| POST | `/rewards/daily` | PLAYER | Claim the server-defined 500 VC daily demo reward |

Transaction history supports `page`, `pageSize` (1–50), and `type` (`WELCOME_BONUS`, `DAILY_REWARD`, `GAME_WAGER`, `GAME_WIN`, `ADMIN_ADJUSTMENT`). Responses expose type, signed amount, balance after, and timestamp, but not internal IDs, idempotency keys, or metadata.

## Favourites and activity

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/users/me/favourites` | PLAYER | Return the player’s active favourite games |
| POST | `/games/:slug/favourite` | PLAYER | Idempotently save a game as a favourite |
| DELETE | `/games/:slug/favourite` | PLAYER | Remove the player’s favourite |
| GET | `/users/me/recent-games` | PLAYER | Return newest recent demo interactions |
| POST | `/games/:slug/recent` | PLAYER | Record a recent demo interaction without a wager |

Favourite writes are protected by the `(userId, gameId)` database uniqueness constraint. Recent activity uses an upserted `(userId, gameId)` row. A game detail’s `Play Demo` action records activity only; it does not debit VC or generate an outcome.

## Public catalogue

- `GET /games`
- `GET /games/:slug`
- `GET /providers`

`GET /games` supports `search`, `category`, `provider` (provider slug), `sort` (`popular`, `newest`, or `name`), `featured`, `popular`, `new` (`true`/`false`), `page`, and `pageSize` (1–100). Invalid query parameters return `400`; unknown slugs return `404`.

## Server-authoritative gameplay

All gameplay mutation routes require an authenticated `PLAYER`, a same-origin request, and an `Idempotency-Key` header containing a safe identifier. Supported wagers are `10`, `25`, `50`, `100`, `250`, and `500` VC. The browser does not submit symbols, cards, numbers, winning lines, payouts, or multipliers.

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/games/neon-relics/spin` | PLAYER + idempotency | Generate, evaluate, and settle one five-reel slots spin |
| POST | `/games/european-roulette/spin` | PLAYER + idempotency | Generate and settle one European Roulette bet |
| POST | `/games/veltrix-blackjack/deal` | PLAYER + idempotency | Start or recoverable-deal one blackjack hand |
| GET | `/games/veltrix-blackjack/recover` | PLAYER | Return the current active hand without dealing again |
| POST | `/games/veltrix-blackjack/:roundId/hit` | PLAYER + idempotency | Draw one server-side card |
| POST | `/games/veltrix-blackjack/:roundId/stand` | PLAYER + idempotency | Resolve the dealer and settle |
| POST | `/games/veltrix-blackjack/:roundId/double` | PLAYER + idempotency | Debit one additional wager, draw one card, and settle |
| GET | `/game-sessions` | PLAYER | Paginated sessions owned by the current player |
| GET | `/game-sessions/:id` | PLAYER | Return one owned session summary |
| GET | `/game-sessions/:id/rounds` | PLAYER | Paginated safe round history for one owned session |

Payouts use one convention across all games: `payout` is the total VC returned after the wager has already been debited. A winning 100 VC red bet therefore creates `GAME_WAGER = -100`, `GAME_WIN = +200`, and `netResult = +100`. Losing rounds do not create a zero-value ledger row.

Neon Relics uses five fixed paylines and server-side symbol multipliers. Blackjack uses dealer stands on soft 17, 3:2 natural blackjack, no split/insurance/surrender, and double only on the initial two-card hand. European Roulette supports red, black, odd, even, and single number 0–36 with a single green zero.

Repeated idempotent requests return the stored response snapshot. A request that reuses a key with a different action or payload returns `409`. Session and round history is scoped by `userId`, so changing an identifier cannot retrieve another player’s records.
