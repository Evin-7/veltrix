# Security

## Passwords

Passwords are validated server-side and hashed with Argon2id using memory cost 19,456 KiB, time cost 2, and parallelism 1. Password hashes are never included in API responses.

## Sessions

The server creates 32-byte random session tokens. The raw token exists only in the HTTP-only cookie; the database stores an HMAC-SHA-256 hash keyed by `AUTH_SECRET`. Sessions expire after 30 days and logout sets `revokedAt` before clearing the cookie.

Cookies use `httpOnly: true`, `sameSite: lax`, `secure: true` in production, `path: /`, and an explicit expiration.

The auth API rejects mismatched browser `Origin` headers. Same-site cookies plus the origin check provide a basic same-origin CSRF boundary for the current single-app deployment.

## Authorization

`requireAuth` validates the session and active user status on the server. `requireRole` is applied independently by every admin route; frontend visibility is never considered authorization. A `PLAYER` cannot access admin routes.

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

Zod validates request bodies and query parameters. JSON mutation bodies must use a JSON content type and are capped at 64 KiB before parsing. Errors map to stable status codes and error codes; Prisma internals and stack traces are not exposed. Server logs intentionally record only a generic internal-error marker for unexpected API failures.

State-changing browser requests require matching `Origin` or `Referer` provenance against the configured application origin; conflicting or missing provenance is rejected. Admin requests use the configured admin origin. Login, registration, OAuth start/callback, profile, favourite, recent-activity, gameplay, product mutations, and admin routes use bounded rate limits. Local development falls back to a small in-memory limiter; production requires the paired `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` variables and uses atomic Redis counters with a 60-second expiry. If the shared store is unavailable, production fails closed with a generic retryable error instead of silently reverting to process-local protection.

## Headers and secrets

Next adds `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-DNS-Prefetch-Control`, and `X-Permitted-Cross-Domain-Policies`. Production HTML receives a per-request nonce CSP with `strict-dynamic`, no `unsafe-eval`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, and `frame-ancestors 'none'`; API responses are explicitly `private, no-store`. Production also emits HSTS and the admin CSP allowlists its configured API origin for `connect-src`. API responses carry a correlation-friendly `X-Request-ID`, and unexpected failures are emitted as structured JSON without request bodies, cookies, stack traces, or secrets. `DATABASE_URL`, `AUTH_SECRET`, seed password overrides, and production rate-limit credentials come only from environment variables. `.env` and `.env.local` are ignored and must never be committed.

For Neon, `DATABASE_URL` contains the pooled application connection and `DIRECT_DATABASE_URL` contains the direct migration/seed connection. Both contain credentials and must remain local secrets. The repository includes only placeholders in `.env.example` and `apps/admin/.env.example`; no real Neon URL is tracked.

## Admin controls

The admin application uses the existing `veltrix_session` cookie and the same password/session service; it does not create a second identity system. Admin API responses include CORS credentials headers only for the configured `ADMIN_APP_URL`. Disabling a player updates status and revokes sessions atomically, so subsequent protected player requests fail immediately.

Only `SUPER_ADMIN` can adjust a player balance. The adjustment endpoint requires a non-zero signed integer, a reason, and an idempotency key. It obtains the wallet row lock and calls `applyWalletMutationToLockedWallet` with `ADMIN_ADJUSTMENT`; it never sets a balance directly. The wallet transaction and audit record commit together. Game/provider screens cannot edit game outcomes, rounds, action responses, or ledger history.

## Phase 6 product-system controls

Promotion eligibility is evaluated from the authenticated player’s stored account creation date and server-side progression. A claim locks the promotion row, checks status/window/eligibility, locks the wallet, and commits the wallet reward, claim, reward history, and notification together. The request idempotency key and `(promotionId, userId)` uniqueness prevent retries and concurrent claims from issuing twice.

XP is calculated from the settled wager in server code. The browser cannot submit XP, VIP level, milestone state, or reward amount. Progression is row-locked before the unique `XpEvent` is created; each VIP milestone has a unique source key and one ledger reward. Admin VIP threshold/reward edits are SUPER_ADMIN-only and audited.

Responsible-gaming settings are scoped to the authenticated user. Gameplay checks cool-off and self-exclusion after locking the player wallet, uses the lower of platform and player wager maximums, and sums UTC-day `GAME_WAGER` debits under that lock. This prevents parallel requests from racing past a daily limit. Admin inspection is read-only and has no casual override path; sensitive player changes create audit records and notifications.

The realtime endpoint uses the authenticated session cookie to scope an SSE stream. It accepts no user identifier, emits only safe display snapshots, and is not used to authorize or settle anything. REST responses and PostgreSQL transactions remain authoritative when the stream is disconnected or stale.

## Demo seed safety

The seed contains fictional local fallback account passwords only for development convenience. In production mode, it refuses to run unless every `SEED_*_PASSWORD` is injected explicitly. Seeded providers, games, players, promotions, transactions, and one clearly marked fictional historical roulette session are idempotent; no privileged production credential is predictable or committed as a deployment secret.

## Scope

Veltrix does not process money, payments, crypto, deposits, withdrawals, purchases, transfers, redemptions, or real-money wagers. Promotions, VIP tiers, and responsible-gaming controls operate only on fictional VC. The game engines are portfolio-grade demonstrations and are not certified real-money gambling software.

## Deployment rules

- Production `APP_URL` and `ADMIN_APP_URL` must use HTTPS. `DATABASE_URL` must be a PostgreSQL URL; Upstash URLs must use HTTPS.
- Keep `DIRECT_DATABASE_URL` in the trusted migration/seed environment only. It is not read by request handlers and must never be exposed as a `NEXT_PUBLIC_` variable.
- Use separate Neon branches/databases for development, preview, and production. Do not run seed, reset, `db push`, or destructive migration commands from a public web request.
- The current Google flow verifies the ID token signature, audience, nonce, `sub`, and `email_verified` before linking. For a stricter production identity policy, replace automatic verified-email linking with an authenticated explicit account-linking flow.
- The Google client secret supplied during development should be treated as exposed through the conversation and rotated before any public deployment. Rotation is intentionally not automated by this repository.
