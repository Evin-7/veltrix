# Veltrix security audit

Audit date: 2026-10-02

Scope: the player-facing Next.js app, the admin Next.js app, Route Handlers, Prisma services/schema/migrations, authentication/OAuth, wallet and reward systems, gameplay engines, responsible-gaming controls, deployment configuration, dependency metadata, and tracked Git history.

## Threat model

| Boundary | Trust level | Main concern |
| --- | --- | --- |
| Public | Untrusted browser, unauthenticated API caller, hostile cross-site origin | credential abuse, malformed input, open redirects, CSRF, XSS, enumeration, denial of service |
| Authenticated player | Session-authenticated but client-controlled browser | IDOR, fake game results, wallet/reward manipulation, repeated claims, restriction bypass |
| Privileged | `ADMIN`/`SUPER_ADMIN` session and configured admin origin | player-data access, account status changes, catalog/reward configuration, VC adjustments, audit integrity |

The highest-integrity boundaries are the server session, server-side role/ownership checks, the locked append-only wallet ledger, server-authoritative game settlement, idempotency/concurrency, and database-backed responsible-gaming timestamps.

## Findings and remediation

### Critical

None confirmed. No route was found that accepts a client-controlled balance, payout, game outcome, reward amount, role, or settlement result as authoritative input.

### High

None confirmed. Protected routes resolve the session server-side, player queries derive ownership from the authenticated user, admin routes apply server-side role checks, and wallet/game mutations use PostgreSQL transactions and row locks.

### Medium

1. **Missing CSP defense-in-depth — fixed.** The web and admin apps previously had security headers but no CSP. Production now creates a per-request nonce in `proxy.ts`, passes it to the root theme script, and emits a strict CSP without `unsafe-eval`. `frame-ancestors 'none'` prevents clickjacking.
2. **Unbounded JSON request bodies — fixed.** `readJson` now requires JSON content types and caps bodies at 64 KiB while streaming, preventing oversized input from reaching JSON parsing or Zod.
3. **Origin checks allowed absent provenance — fixed.** State-changing player/admin requests now require a matching `Origin` or `Referer`; cross-site, conflicting, malformed, and provenance-free browser requests are rejected.
4. **Gameplay and OAuth mutation/abuse surface lacked route-level rate limits — fixed.** Gameplay and OAuth initiation/callback now use the same shared limiter. Production fails closed when Upstash is not configured or unavailable; local development retains only the bounded in-memory fallback.
5. **Integer-only ledger versus odd blackjack natural return — fixed.** A 25-VC natural previously computed `62.5` and could fail during settlement. Natural returns now round down to an integer before ledger insertion; the behavior is covered by a test.

### Low

1. **Unbounded admin page numbers — fixed.** Admin and promotion list schemas now cap page numbers at 10,000, matching the existing bounded page sizes.
2. **Two mutation route parameters lacked explicit runtime UUID validation — fixed.** Promotion claim and notification-read routes now parse UUIDs before calling services.
3. **Registration schemas accepted unknown fields — fixed.** Login and registration schemas are strict, so attempted role/status mass assignment is rejected rather than silently accepted.

## Audit results

### Secrets

No `.env`, `.env.local`, database URL, Google secret, private key, or other real secret is tracked in the repository or present in the scanned Git history. Only placeholders and test values appear in tracked files. Local ignored environment files do contain development credentials, which is expected but must remain outside Git and deployment artifacts. The Google client secret provided during this development conversation should be rotated before public deployment; this audit does not rotate credentials automatically.

### Authentication, sessions, and OAuth

- Passwords use Argon2id with 19,456 KiB memory, time cost 2, and parallelism 1; password input is bounded to 128 characters, registration conflicts are generic, and login always performs a dummy Argon2id verification for missing/disabled accounts to reduce timing-based enumeration.
- Registration always creates `PLAYER`; role/status/wallet fields are not accepted.
- Session cookies are HTTP-only, SameSite=Lax, Secure in production, path-scoped, and explicitly expiring. Only an HMAC-SHA-256 token hash is stored in `AuthSession`; login and Google login revoke the existing session and create a new token.
- Expired, revoked, and disabled-user sessions are rejected server-side. Logout revokes server state and clears the cookie.
- Google uses signed state, a nonce, PKCE S256, verified ID-token audience/signature, verified email, and an internal-only return path. Admin accounts cannot be auto-linked through the player Google route.
- Same-email linking is currently allowed for an existing active player after Google’s verified identity checks. This is reasonable for the demo but should become an explicit authenticated link action if the product moves toward higher-assurance identity requirements.

### Authorization and IDOR

The audit reviewed all versioned Route Handlers. Protected player routes derive `userId` from the session; game sessions, rounds, favourites, recent games, notifications, wallet, rewards, and responsible-gaming queries include that owner. Admin routes call `requireAuth` plus server-side role checks. No client-provided role, wallet ID, or arbitrary user ID controls player ownership. Admin balance adjustment accepts a target player ID only within a `SUPER_ADMIN`-authorized operation and writes through the ledger.

### CSRF, redirects, validation, and headers

State-changing routes enforce same-origin provenance, and admin CORS only reflects the configured admin origin. `sanitizeNextPath` rejects absolute, protocol-relative, backslash, and encoded-origin redirect attempts by reducing them to internal paths. Zod validates bodies, query parameters, route IDs, enums, integer ranges, and strict object shapes. API responses are no-store to prevent user-specific caching. Production CSP, HSTS, frame denial, nosniff, referrer, permissions, and cross-domain policy headers are configured centrally for both apps.

### Rate limits and dependencies

Login, registration, OAuth, gameplay, rewards, profile, favourites, activity, promotion, responsible-gaming, notification, and admin operations are covered by the limiter. Shared production enforcement requires Upstash REST credentials; no paid service was silently added. `npm audit` and `npm audit --omit=dev` both report zero vulnerabilities. No `audit fix --force` was run. The existing Prisma raw SQL uses tagged `Prisma.sql` interpolation for row locks/aggregates; no unsafe raw SQL API was found.

### Wallet, games, rewards, and responsible gaming

- Wallet mutations are integer-only, bounded, locked, append-only, and transactionally coupled to ledger rows. Database checks enforce non-negative balances and balance math; a trigger prevents ledger updates/deletes.
- Game outcomes, RNG, wagers, payouts, Blackjack state, roulette numbers, slots, baccarat, dice, and arcade settlement are server-owned. `crypto.randomInt` is used for authoritative randomness; browser scores/results are not accepted.
- Gameplay actions, daily rewards, promotion claims, VIP milestones, and wallet mutations use unique/idempotent keys and transaction locks. Duplicate/concurrent claim paths return the original result or conflict safely.
- Cool-off, self-exclusion, max wager, and UTC daily wager limits are read from the database while the wallet is locked before settlement. Client clocks/local storage do not enforce these controls.

### N/A / not found

No file upload/download endpoint, service worker/PWA cache, Server Action, public seed/reset/debug route, arbitrary server-side user URL fetch, dangerous `dangerouslySetInnerHTML`, `eval`, unsafe raw Prisma API, or client-side auth/OAuth token storage was found. Browser local storage is limited to theme/audio preferences.

## Verification

- Web TypeScript: passed.
- Admin TypeScript: passed.
- Web ESLint: passed.
- Admin ESLint: passed.
- Web tests: passed after remediation, including origin, JSON body-limit, strict credential-shape, and integer blackjack tests.
- Production web/admin builds: passed with `npm run build`; both apps were also started with `next start` and representative HTML/API headers were inspected.
- Dependency audit: passed with zero reported vulnerabilities.
- `git diff --check`: passed.

## Required operator actions

1. Rotate the Google client secret supplied during development before exposing the app publicly, then update Vercel’s server-only `GOOGLE_CLIENT_SECRET` in the web project.
2. Set production `APP_URL` and `ADMIN_APP_URL` to HTTPS origins and register the exact Google callback URL for the production web origin.
3. Configure both Upstash REST variables in Vercel production and preview environments, with separate rate-limit stores where isolation is required.
4. Use separate Neon branches/databases for development, preview, and production; keep `DIRECT_DATABASE_URL` only in the trusted migration environment.
5. Restrict the admin deployment at the hosting/identity layer in addition to application role checks.

## Accepted residual risks

This is still a fictional-credit portfolio demonstration and is not certified real-money gambling software. The demo’s automatic verified-email OAuth linking is a product convenience rather than a high-assurance account-linking workflow. Rate limiting is only horizontally shared when Upstash is configured; production intentionally rejects protected requests if it is absent, which protects integrity at the cost of availability. No independent penetration test or database-provider IAM review was performed.
