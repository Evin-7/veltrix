# Veltrix Phase 5 Architecture

## Decision summary

Veltrix remains a small npm workspace with `apps/web` as the active app. Phases 2 and 3 use Next.js Route Handlers as the versioned REST host instead of introducing a second API process. This keeps local setup, same-origin cookies, deployment, and error handling simple while the product has one frontend consumer. Neon supplies hosted PostgreSQL for local development; Prisma remains the only ORM and migration boundary.

The backend boundary is explicit:

```text
Route Handler → Zod schema → service → Prisma client → PostgreSQL
```

Route handlers are responsible for HTTP concerns only. Auth, rate limiting, error mapping, and game queries live in server-only modules that can be moved to `services/api` later without rewriting domain behavior.

## Runtime boundaries

- `apps/web/src/app/api/v1`: player and admin REST endpoints
- `apps/admin`: separate browser UI for back-office operations; it does not own auth or persistence
- `apps/web/src/server/db`: lazy Prisma client initialization
- `apps/web/src/server/auth`: password hashing, sessions, authorization, and schemas
- `apps/web/src/server/games`: database queries, public game mapping, and query validation
- `apps/web/src/server/wallet`: integer VC wallet summaries, daily rewards, and the append-only mutation service
- `apps/web/src/server/gameplay`: secure randomness, pure game rules, round orchestration, recovery, and session history
- `apps/web/src/server/users`: profile changes, favourites, and recently played activity
- `apps/web/src/server/http`: API envelopes, safe errors, rate limiting, and origin checks
- `apps/web/src/server/observability`: structured JSON logs and request-correlation primitives
- `apps/web/src/server/admin`: admin queries, permissioned mutations, and audit writes
- `apps/web/src/server/promotions`: eligibility, idempotent claims, and reward issuance
- `apps/web/src/server/rewards`: gameplay XP, VIP thresholds, milestone rewards, and reward history
- `apps/web/src/server/responsible-gaming`: player limits, pause controls, UTC wager enforcement, and status
- `apps/web/src/server/notifications`: scoped notification reads and writes
- `apps/web/src/server/realtime`: authenticated display snapshots for SSE consumers
- `prisma`: schema, committed migration, and development seed

Prisma is initialized lazily on the first server request. `DATABASE_URL` is the pooled Neon URL used by the Node.js application, while `DIRECT_DATABASE_URL` is used by Prisma CLI commands through the schema datasource `directUrl`. This keeps application connections pool-friendly and migration operations session-safe without changing the PostgreSQL architecture.

## UI data flow

The homepage, casino lobby, and game detail page are Server Components and call the same server-side game service used by the REST API. This avoids an unnecessary HTTP round trip from a Next server render while keeping the public API available to external consumers.

The lobby receives the complete small seeded catalogue and performs its interactive filtering locally to preserve the Phase 1 experience. The API independently supports validated pagination and filtering for larger consumers.

## Authentication flow

1. Register validates email, username, and password with Zod.
2. One database transaction creates the `PLAYER`, profile, wallet, and `WELCOME_BONUS` ledger entry.
3. Argon2id hashes the password before persistence.
4. Login creates a fresh random session token.
5. Only an HMAC-SHA-256 token hash is stored in `AuthSession`.
6. The raw token is sent in an HTTP-only, same-site cookie.
7. Current-user reads validate hash, expiry, revocation, and user status server-side.
8. Logout revokes the session and clears the cookie.

## Wallet boundary

Route handlers never update `Wallet.balance` directly. They authenticate and authorize the player, validate only query/body shape, then call the wallet or activity service. Reward amounts and transaction types are constants in server code.

The wallet mutation service runs inside a Prisma PostgreSQL transaction. It locks the wallet row with `SELECT "id", "userId", "balance" ... FOR UPDATE`, checks a unique idempotency key, calculates the signed integer balance, rejects negative or over-limit balances, updates `Wallet`, and inserts `WalletTransaction` before committing. The ledger also has a PostgreSQL trigger that rejects updates and deletes.

The same service is used by registration, seeding, and Phase 4 game-session mutations. Gameplay passes the locked wallet through the existing mutation primitive; route handlers and client components never update a balance directly.

## Server-authoritative gameplay

The Phase 4 boundary is:

```text
Route Handler → auth/origin/idempotency → Zod input → gameplay service
  → PostgreSQL transaction + wallet lock → pure engine → round/session/ledger commit
```

`GameSession` groups a player’s rounds for one game. `GameRound` stores the wager, total-return payout, net result, game type, public settled result, and server-only active state where needed. `GameAction` stores the action type, request hash, idempotency key, and response snapshot. A partial unique index permits at most one pending/active round per session.

Slots and roulette settle in one transaction. Blackjack debits the initial deal once, stores the shuffled deck and hidden dealer card only in `GameRound.state`, charges one additional wager for double, and settles on stand, bust, or automatic resolution. `GameRound.state` is never returned to the browser; active responses are sanitized projections.

The pure engines do not import Prisma or wallet code. They accept an injectable random source for deterministic tests. Production uses Node’s cryptographically secure `crypto.randomInt` and Fisher–Yates shuffle. This is a portfolio/demo RNG design, not an independently certified real-money gambling system.

The client never stores a session token in localStorage and never chooses a role.

## Admin boundary

The admin UI runs on `http://localhost:3001` during local development and calls the existing web/API app on `http://localhost:3000`. The web app allows only the configured `ADMIN_APP_URL` as an admin API origin, sends credentials, and uses the same `veltrix_session` cookie. Every admin route independently validates the session and role; UI hiding is not an authorization boundary.

Admin writes use the following safety rules:

- disabling a player revokes all active sessions in the same transaction and writes an audit event;
- VC corrections are available only to `SUPER_ADMIN`, require a reason and idempotency key, lock the wallet, and call the existing append-only ledger primitive;
- game/provider operations are limited to metadata and availability; rounds, outcomes, balances, and settlement history are read-only;
- `AuditLog` has no update/delete API and is added by a new migration without changing prior migration history.

## Phase 6 product systems

Promotions, progression, responsible gaming, notifications, and realtime presentation are layered onto the Phase 4 gameplay transaction. A completed round first performs the existing wager/payout settlement, then records one server-derived XP event while the wallet lock is still held. Crossing a configured VIP threshold can append one `VIP_REWARD` ledger entry, one immutable `RewardHistory` row, and one notification. Promotion claims follow the same wallet ledger primitive and are protected by both a unique business claim and request idempotency.

Responsible-gaming settings are user-owned rows. Before a new wager is debited, gameplay checks active self-exclusion/cool-off, applies `min(platformMaxWager, playerMaxWager)`, and aggregates the current UTC day’s `GAME_WAGER` debits while the player wallet is locked. This makes daily limits safe under concurrent requests without introducing a second balance or settlement path. Session reminders are informational; cool-off and self-exclusion are blocking controls.

Realtime uses authenticated Server-Sent Events rather than Socket.IO. The current Next deployment needs one-way server-to-browser snapshots, and SSE keeps the dependency and operational surface small. The stream is scoped from the session cookie, never accepts a client user ID, and polls authoritative PostgreSQL-backed state. Disconnects, missed events, or disabled sockets do not affect REST mutations or wallet integrity.

Production requests receive a request ID at the Next.js 16 `proxy.ts` boundary. API error responses repeat that ID and unexpected failures emit safe structured JSON logs. The local rate limiter is intentionally process-local for zero-dependency development; production uses Upstash REST counters so multiple serverless instances share the same policy. See [OBSERVABILITY.md](./OBSERVABILITY.md) and [DEPLOYMENT.md](./DEPLOYMENT.md).

## Phase boundaries

Phases 5 and 6 contain back-office observability, controlled virtual-credit administration, product rewards, responsible-gaming controls, and display-only realtime updates. The system still intentionally does not contain real-money functionality, deposits, withdrawals, purchases, transfers, crypto, payment operations, or cash-out.
