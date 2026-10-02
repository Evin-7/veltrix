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

API responses include an `X-Request-ID` header. Use it to correlate a generic 5xx response with the structured server log; credentials, cookies, request bodies, and stack traces are never returned. Expired sessions return `401`, insufficient VC and business conflicts return `409`, rate limits return `429` with `Retry-After`, and temporary dependency failures return `503` with a retryable message.

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

Transaction history supports `page`, `pageSize` (1–50), and `type` (`WELCOME_BONUS`, `DAILY_REWARD`, `GAME_WAGER`, `GAME_WIN`, `ADMIN_ADJUSTMENT`, `PROMOTION_REWARD`, `VIP_REWARD`). Responses expose type, signed amount, balance after, and timestamp, but not internal IDs, idempotency keys, or metadata.

## Product systems

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/promotions` | PLAYER | Return active promotions for which the current player is eligible |
| POST | `/promotions/:id/claim` | PLAYER + idempotency | Claim one eligible promotion exactly once |
| GET | `/rewards/overview` | PLAYER | Return current XP, VIP level, thresholds, and recent reward history |
| GET | `/rewards/history` | PLAYER | Paginated reward history owned by the current player |
| GET/PATCH | `/responsible-gaming/settings` | PLAYER | Read or update reminder, daily limit, and max-wager controls |
| GET | `/responsible-gaming/status` | PLAYER | Return UTC wager usage and active-session status |
| POST | `/responsible-gaming/cool-off` | PLAYER | Start a 1-hour, 24-hour, or 7-day cool-off |
| POST | `/responsible-gaming/self-exclusion` | PLAYER | Start a 1-day, 7-day, 30-day, or 365-day demo self-exclusion |
| GET | `/notifications` | PLAYER | Return the current player’s notifications and unread count |
| PATCH | `/notifications/:id/read` | PLAYER | Mark one owned notification read |
| POST | `/notifications/read-all` | PLAYER | Mark all current-player notifications read |
| GET | `/realtime` | PLAYER | Authenticated SSE snapshots for wallet, unread notifications, and active session |

Gameplay enforcement runs inside the existing PostgreSQL transaction after the wallet row is locked. The effective wager maximum is the lower of the platform maximum and player maximum. UTC daily usage is calculated from `GAME_WAGER` rows while that same wallet lock is held, so concurrent requests cannot bypass the configured limit. Cool-off and self-exclusion reject gameplay server-side.

Promotion eligibility, reward amounts, XP, and VIP transitions are server-owned. Client input cannot supply XP, reward amounts, progression levels, or a user ID. Promotion claims use both an idempotency key and `(promotionId, userId)` uniqueness.

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

## Admin API

Admin APIs are hosted by the existing web app under `/api/v1/admin`. Each route independently requires a valid active session and either `ADMIN` or `SUPER_ADMIN`; player sessions receive `403`. Cross-origin browser calls are accepted only from `ADMIN_APP_URL` and must include credentials.

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/admin/auth/login` | Admin credentials | Reuse the existing password/session implementation for admin sign-in |
| GET | `/admin/auth/me` | ADMIN/SUPER_ADMIN | Return the current admin |
| POST | `/admin/auth/logout` | ADMIN/SUPER_ADMIN | Revoke the current session |
| GET | `/admin/dashboard` | ADMIN/SUPER_ADMIN | Server-derived KPIs, trends, and top games |
| GET | `/admin/players` | ADMIN/SUPER_ADMIN | Filtered, paginated player list |
| GET | `/admin/players/:id` | ADMIN/SUPER_ADMIN | Player, wallet, ledger, and session detail |
| PATCH | `/admin/players/:id/status` | ADMIN/SUPER_ADMIN | Enable/disable a player and audit it |
| POST | `/admin/wallet/adjustments` | SUPER_ADMIN + Idempotency-Key | Append a compensating `ADMIN_ADJUSTMENT` ledger entry |
| GET | `/admin/transactions` | ADMIN/SUPER_ADMIN | Read-only transaction explorer |
| GET | `/admin/games`, `/admin/providers` | ADMIN/SUPER_ADMIN | Catalog metadata and provider management |
| PATCH/POST | `/admin/games/:id`, `/admin/games` | ADMIN/SUPER_ADMIN | Edit/create game metadata; new games start inactive |
| PATCH/POST | `/admin/providers/:id`, `/admin/providers` | ADMIN/SUPER_ADMIN | Edit/create provider metadata/status |
| GET | `/admin/sessions`, `/admin/sessions/:id` | ADMIN/SUPER_ADMIN | Read-only session, round, and action explorer |
| GET | `/admin/audit-logs` | ADMIN/SUPER_ADMIN | Paginated append-only audit history |
| GET/POST | `/admin/promotions` | ADMIN/SUPER_ADMIN | List or create promotions |
| PATCH | `/admin/promotions/:id` | ADMIN/SUPER_ADMIN | Update promotion lifecycle/configuration |
| GET | `/admin/promotions/:id/claims` | ADMIN/SUPER_ADMIN | Inspect claims for one promotion |
| GET | `/admin/rewards/config` | ADMIN/SUPER_ADMIN | Read VIP thresholds and milestone rewards |
| PATCH | `/admin/rewards/config` | SUPER_ADMIN | Update one VIP configuration row with audit |
| GET | `/admin/rewards/history` | ADMIN/SUPER_ADMIN | Inspect immutable reward history |
| GET | `/admin/responsible-gaming` | ADMIN/SUPER_ADMIN | Read-only inspection of player restrictions |

Admin list endpoints use the same `{ data, meta }` envelope and validate pagination/filter inputs with Zod. The API never accepts arbitrary mass-assignment objects; game/provider fields are explicitly allowlisted.
