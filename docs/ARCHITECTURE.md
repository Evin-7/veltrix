# Veltrix Phase 3 Architecture

## Decision summary

Veltrix remains a small npm workspace with `apps/web` as the active app. Phases 2 and 3 use Next.js Route Handlers as the versioned REST host instead of introducing a second API process. This keeps local setup, same-origin cookies, deployment, and error handling simple while the product has one frontend consumer. Neon supplies hosted PostgreSQL for local development; Prisma remains the only ORM and migration boundary.

The backend boundary is explicit:

```text
Route Handler → Zod schema → service → Prisma client → PostgreSQL
```

Route handlers are responsible for HTTP concerns only. Auth, rate limiting, error mapping, and game queries live in server-only modules that can be moved to `services/api` later without rewriting domain behavior.

## Runtime boundaries

- `apps/web/src/app/api/v1`: REST endpoints
- `apps/web/src/server/db`: lazy Prisma client initialization
- `apps/web/src/server/auth`: password hashing, sessions, authorization, and schemas
- `apps/web/src/server/games`: database queries, public game mapping, and query validation
- `apps/web/src/server/wallet`: integer VC wallet summaries, daily rewards, and the append-only mutation service
- `apps/web/src/server/gameplay`: secure randomness, pure game rules, round orchestration, recovery, and session history
- `apps/web/src/server/users`: profile changes, favourites, and recently played activity
- `apps/web/src/server/http`: API envelopes, safe errors, rate limiting, and origin checks
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

## Phase boundaries

Phase 4 contains virtual-credit gameplay only. It still intentionally does not contain real-money functionality, deposits, withdrawals, purchases, transfers, crypto, admin wallet adjustment UI, VIP rewards, promotions, or WebSockets.
