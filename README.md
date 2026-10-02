# VELTRIX

Veltrix is a premium virtual-credit gaming demonstration platform. It is a portfolio project exploring product design, responsive React architecture, secure authentication, database-backed game catalogues, and a future server-led game platform.

> **Important:** Veltrix is a portfolio demonstration project. All currencies and wagers are fictional. The platform does not accept deposits, withdrawals, or real-money wagers.

## Phase 5 scope

Phase 5 adds a separate `apps/admin` control room backed by the existing web app’s versioned admin APIs:

- ADMIN and SUPER_ADMIN-only dashboard, player, catalog, session, transaction, and audit views
- server-derived dashboard KPIs and activity trends for 24-hour, 7-day, and 30-day ranges
- player status controls that revoke active sessions immediately when disabled
- SUPER_ADMIN-only compensating VC adjustments through the existing locked, append-only wallet ledger
- provider and game metadata/status management without outcome or settlement editing
- append-only `AuditLog` records for operational mutations

The admin UI does not introduce a second auth or database system. `apps/admin` uses the existing Veltrix session cookie and calls protected admin route handlers hosted by `apps/web`.

## Phase 6 scope

Phase 6 adds product systems around the existing server-authoritative games:

- one-time, idempotent promotions with eligibility checks and ledger-backed claims
- server-derived gameplay XP, configurable Bronze/Silver/Gold/Platinum/Diamond VIP levels, milestone rewards, and immutable reward history
- server-enforced session reminders, UTC daily wager limits, player maximum wagers, cool-off, and demo self-exclusion
- player notifications and an authenticated Server-Sent Events snapshot stream for wallet, notification, and active-session updates
- player pages for promotions, rewards, responsible gaming, and notifications
- admin promotion lifecycle, VIP configuration, reward history, and read-only responsible-gaming inspection

REST and PostgreSQL remain authoritative. The realtime stream is a convenience for display updates and never controls wallet integrity. Veltrix still has no real-money play, deposits, withdrawals, payment, crypto, purchasable VC, or cash-out.

## Current player platform

The current player-facing experience also includes:

- a responsive casino catalogue with search, category/provider filters, favourites, recent activity, and game detail pages
- server-authoritative Neon Relics, slots, blackjack, European roulette, baccarat, dice, and arcade-style Neon Paddock gameplay
- reusable game routes and settlement orchestration with idempotent wallet mutations
- optional Google sign-in using signed OAuth state, PKCE, secure internal return paths, and provider-account linking
- a shared browser Web Audio system with persistent sound preferences, game-specific feedback, subtle arcade ambience, and no autoplay
- responsive light/dark/system themes, a shared player design system, full-bleed page composition, and accessible loading/feedback states

All gameplay remains fictional VC play. The project does not provide real-money gambling, deposits, withdrawals, cash value, or regulatory licensing.

## Phase 3 scope

Phase 1 and Phase 2 remain intact. Phase 3 adds:

- hosted Neon PostgreSQL for local development
- Prisma 6.12 schema, migration, and idempotent seed
- database-backed game/provider APIs
- Argon2id password hashing
- HTTP-only, hashed-token sessions with expiry and revocation
- register, login, logout, current-user, and protected user endpoints
- Zod validation, consistent API errors, same-origin checks, rate limiting, and secure headers
- polished login/register UI connected to the real API
- server-rendered homepage, lobby, and game detail pages backed by PostgreSQL
- integer VC wallets and an append-only transaction ledger
- atomic welcome credits and daily demo rewards
- player profile, wallet, and transaction pages
- player favourites and recently played activity
- authenticated wallet, reward, profile, favourite, and activity APIs
- PostgreSQL-backed concurrency and ledger integrity tests

Veltrix Credits (VC) are fictional demonstration credits. They have no monetary value and cannot be purchased, transferred, redeemed, or withdrawn. Phase 3 does not implement deposits, withdrawals, payments, crypto, wagering, game outcomes, WebSockets, VIP rewards, or an admin dashboard.

## Stack

- Next.js 16 App Router and React 19
- TypeScript with strict mode
- Tailwind CSS 4 and Lucide React
- PostgreSQL 16
- Prisma 6.12 ORM
- Zod request validation
- Argon2id password hashing
- Vitest
- npm workspaces
- Google Auth Library for optional OAuth sign-in

Prisma 6.12 is pinned intentionally because the current Prisma 6.13+ CLI dependency tree reports a high-severity `deepmerge-ts` advisory. The pinned version has a clean audit in this repository.

## Run locally

Requirements: Node.js 20+, npm 10+, and a Neon PostgreSQL project/branch. Docker and a local PostgreSQL server are not required.

```bash
npm ci
cp .env.example .env
cp .env.example apps/web/.env.local
cp apps/admin/.env.example apps/admin/.env.local
```

From Neon’s **Connect** dialog, copy both connection strings into both environment files:

- `DATABASE_URL`: the pooled URL with `-pooler` in the hostname, used by the Next.js runtime.
- `DIRECT_DATABASE_URL`: the direct URL without `-pooler`, used by Prisma CLI migrations and seed operations.

Replace `AUTH_SECRET` in both files with a random value of at least 32 characters. For example:

```bash
openssl rand -base64 32
```

Google sign-in is optional. To enable it locally, set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in the web environment and register this callback URL with the Google OAuth web application:

```text
http://localhost:3000/api/v1/auth/google/callback
```

Both Google variables must be configured together. The client secret is server-only and must never be committed.

Initialize the hosted Neon database with the committed migrations and idempotent seed:

```bash
npm run db:generate
npm run db:migrate:deploy
npm run db:seed
npm run dev
# In a second terminal:
npm run dev:admin
```

Open [http://localhost:3000](http://localhost:3000).
Open [http://localhost:3001](http://localhost:3001) for the admin control room.

Useful commands:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run typecheck:admin
npm run lint:admin
npm run build:admin
npm run db:migrate          # safe alias for migrate:deploy
npm run db:migrate:dev      # migration authoring only; not for shared data
npm run format
```

`DATABASE_URL`, `DIRECT_DATABASE_URL`, `AUTH_SECRET`, `APP_URL`, `ADMIN_APP_URL`, and `NODE_ENV` are validated or consumed by the local apps. `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are optional locally and required together for shared production rate limiting. The default migration command is `prisma migrate deploy`, which applies committed migrations without resetting or recreating the hosted database. There is intentionally no reset script in the Neon workflow. Never commit `.env`, `.env.local`, or production secrets.

`docker-compose.yml` remains only as an optional legacy fallback for contributors who explicitly choose local PostgreSQL. It is not part of the default setup and is not needed for VELTRIX development on a storage-constrained Mac.

For deployment, observability, and safe Neon release sequencing, see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). System diagrams are in [docs/DIAGRAMS.md](docs/DIAGRAMS.md), and the concise portfolio summary is in [docs/PORTFOLIO.md](docs/PORTFOLIO.md).

## Phase 4 scope

Phase 4 adds three server-authoritative fictional-credit games:

- **Neon Relics**: five-reel, three-row slots with five fixed paylines.
- **Veltrix Blackjack**: dealer stands on soft 17, blackjack pays 3:2, double is allowed on the initial two-card hand, and split/insurance/surrender are excluded.
- **European Roulette**: single-zero roulette with red, black, odd, even, and single-number bets.

All wagers are restricted server-side to `10`, `25`, `50`, `100`, `250`, or `500` VC. Wagers are debited as `GAME_WAGER` and only positive total returns are appended as `GAME_WIN`; `payout` consistently means the total amount returned after the wager was already debited. Phase 6 responsible-gaming controls can further lower the effective maximum.

The browser sends only a permitted wager/bet and an `Idempotency-Key`. The server generates outcomes with Node cryptographic randomness, evaluates rules, settles the round, updates the wallet, and returns the authoritative result. Blackjack’s active deck and hidden dealer card remain server-side in the database and can be recovered after refresh.

## Development demo accounts

These fictional accounts are created by the development seed only. The seed accepts `SEED_*_PASSWORD` variables and refuses production-mode seeding unless every password is explicitly injected. Never reuse local fallback credentials in a deployed environment; use a disposable Neon branch for demonstrations.

| Role | Email |
| --- | --- | --- |
| SUPER_ADMIN | `superadmin@veltrix.local` |
| ADMIN | `admin@veltrix.local` |
| PLAYER | `player@veltrix.local` |
| PLAYER | `player2@veltrix.local` |
| PLAYER | `player3@veltrix.local` |

Seed passwords are hashed before persistence. Registration always creates a `PLAYER`; role selection is not accepted from the client.

## Repository shape

```text
veltrix/
├── apps/web/src/app/            # Player UI and versioned Next Route Handlers
├── apps/admin/src/app/          # Admin control-room UI
├── apps/web/src/server/         # Prisma, auth, validation, services, errors
├── apps/web/src/features/       # UI-facing feature types and presentation
├── apps/web/src/server/gameplay/ # pure game engines and transactional orchestration
├── prisma/schema.prisma         # PostgreSQL data model
├── prisma/migrations/           # committed migration history
├── prisma/seed.ts               # idempotent development seed
├── docker-compose.yml            # optional legacy local PostgreSQL fallback
├── e2e/                         # explicit, disposable-branch Playwright journeys
└── docs/                        # architecture, database, API, security, deployment
```

The API currently lives in Next Route Handlers instead of a second `services/api` process. The server modules are separated from route handlers so extraction into a standalone service remains possible when the admin/API workload warrants the extra deployment boundary.

## Wallet model

Every `PLAYER` receives one wallet and a `+10,000 VC` `WELCOME_BONUS` entry. Credits are positive ledger amounts and debits are negative amounts; `balanceAfter = balanceBefore + amount`. Wallet writes are server-owned and never accept an amount, type, user ID, or timestamp from the browser.

`POST /api/v1/rewards/daily` grants `+500 VC` once per UTC calendar day. Welcome and daily operations use database-unique idempotency keys, and all mutations lock the wallet row with PostgreSQL `SELECT ... FOR UPDATE` before updating the wallet and appending the ledger entry in one transaction. Neon remains PostgreSQL, so no wallet or application architecture changes are needed.

The development seed gives the first player a welcome reward, a historical daily reward, favourites, and recent games. It is safe to run repeatedly.

## Phase 4 wallet settlement

Game sessions and rounds are recorded in PostgreSQL. Each settled round is linked to its wager and payout ledger entries through the round reference identifier. Session totals are derived from settled server-side round values, never from browser state. Repeated action requests return the original stored response and do not create another round, wager, payout, or card action.

The game RNG uses `crypto.randomInt`, which uses rejection sampling for bounded values, and Fisher–Yates shuffling for cards. This is appropriate for a portfolio demonstration and has not been independently certified for real-money gambling.
