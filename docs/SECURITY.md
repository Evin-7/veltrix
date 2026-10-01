# Security

## Passwords

Passwords are validated server-side and hashed with Argon2id using memory cost 19,456 KiB, time cost 2, and parallelism 1. Password hashes are never included in API responses.

## Sessions

The server creates 32-byte random session tokens. The raw token exists only in the HTTP-only cookie; the database stores an HMAC-SHA-256 hash keyed by `AUTH_SECRET`. Sessions expire after 30 days and logout sets `revokedAt` before clearing the cookie.

Cookies use `httpOnly: true`, `sameSite: lax`, `secure: true` in production, `path: /`, and an explicit expiration.

The auth API rejects mismatched browser `Origin` headers. Same-site cookies plus the origin check provide a basic same-origin CSRF boundary for the current single-app deployment.

## Authorization

`requireAuth` validates the session and active user status on the server. `requireRole` is a reusable server-side guard for future admin endpoints. Frontend visibility is never considered authorization.

Registration always assigns `PLAYER`; role fields are not accepted from the client.

Wallet, daily reward, favourite, and recent activity routes require `PLAYER` authorization server-side. Profile edits use a strict allowlist of `displayName` and `avatarUrl`; role, status, email, balance, transaction type, user ID, and timestamps cannot be mass-assigned.

## Wallet integrity

Veltrix Credits (VC) are fictional demonstration credits. They have no monetary value and cannot be purchased, transferred, redeemed or withdrawn.

The browser never supplies wallet amounts or transaction types. Registration and daily reward values are constants in server code. Balances are integer VC units, and service plus database constraints reject zero amounts, negative balances, invalid balance math, and the configured integer ceiling.

Every wallet mutation locks the player’s row with PostgreSQL `SELECT ... FOR UPDATE`, checks idempotency, then updates the balance and appends the ledger entry in one transaction. This prevents two concurrent debits from spending the same VC. Welcome and daily operations have unique database idempotency keys. A database trigger rejects ledger updates and deletes; corrections must be compensating entries.

Daily rewards use the server’s UTC date, not a client timestamp, and check the current day while holding the wallet lock. Refreshes and parallel requests cannot double-credit the reward.

Favourites, recent-game, gameplay, and session-history routes scope every query to the authenticated user. The route identifier is restricted to a safe slug/UUID shape and the game must be active; no user-owned row can be addressed by another user’s ID.

## Server-authoritative games

Game outcomes, card draws, roulette numbers, slot reels, payout calculations, and final settlement are server-owned. The browser can choose only a validated wager and supported bet/action shape. Secure bounded values come from Node `crypto.randomInt`; cards use server-side Fisher–Yates shuffling. `Math.random()` is not used for authoritative outcomes.

Each mutation is protected by an idempotency key and a PostgreSQL transaction. The wallet row is locked before wager or payout mutation, active Blackjack rounds are row-locked before actions, and `GameAction.requestHash` prevents a key from being replayed with a different payload. Wager and positive payout entries reference the settled round business identifier. A round cannot settle twice, and losing rounds do not append fake zero-value wins.

Active Blackjack state—including the remaining deck and dealer hole card—is stored server-side in `GameRound.state` and is never serialized into cookies or returned to the browser. The recovery endpoint returns only a sanitized player/dealer projection. Session and round endpoints enforce ownership in their database predicates to prevent IDOR.

The game rules and RNG source are unit-testable with deterministic injected sources; production randomness uses cryptographic APIs. This implementation is for a portfolio demonstration using fictional VC and has not been independently certified for real-money gambling.

## Request and error handling

Zod validates request bodies and query parameters. Errors map to stable status codes and error codes; Prisma internals and stack traces are not exposed. Server logs intentionally record only a generic internal-error marker for unexpected API failures.

Login, registration, profile, favourite, recent-activity, and daily-reward mutations use a small in-memory per-process rate limiter. This is appropriate for the single-process portfolio demo, but production horizontal scaling should move the limiter to a shared store or edge gateway before exposing the endpoints publicly.

## Headers and secrets

Next adds `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy`. `DATABASE_URL`, `AUTH_SECRET`, and seed password overrides come only from environment variables. `.env` and `.env.local` are ignored and must never be committed.

For Neon, `DATABASE_URL` contains the pooled application connection and `DIRECT_DATABASE_URL` contains the direct migration/seed connection. Both contain credentials and must remain local secrets. The repository includes only placeholders in `.env.example`; no real Neon URL is tracked.

## Scope

Veltrix does not process money, payments, crypto, deposits, withdrawals, purchases, transfers, redemptions, or real-money wagers. Phase 4 adds fictional-credit gameplay only; admin adjustment UI, promotions, VIP tiers, WebSockets, and production-grade distributed rate limiting remain out of scope.
