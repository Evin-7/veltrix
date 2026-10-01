# Database

## Hosted Neon PostgreSQL

Local development uses a hosted Neon PostgreSQL branch. Copy `.env.example` to both `.env` and `apps/web/.env.local`, then set:

- `DATABASE_URL` to Neon’s pooled connection string for application traffic.
- `DIRECT_DATABASE_URL` to Neon’s direct connection string for Prisma CLI operations. Remove `-pooler` from the hostname when selecting the direct URL in Neon’s Connect dialog.

Initialize the existing database with:

```bash
npm run db:generate
npm run db:migrate:deploy
npm run db:seed
```

`npm run db:migrate` is a safe alias for `prisma migrate deploy`. It applies only committed migrations and does not reset the hosted database. `npm run db:migrate:dev` is retained for authoring future migrations and must not be pointed at shared data without an explicit review. There is no reset command in the Neon setup. `docker-compose.yml` remains an optional legacy local PostgreSQL fallback, not a development requirement.

## Schema

### User and authentication

- `User`: normalized email, Argon2id password hash, role, status, timestamps, and last login.
- `Profile`: one-to-one public identity with unique username.
- `AuthSession`: hashed session token, expiry, revocation timestamp, and user relation.

Users and sessions use UUID identifiers. Deleting a user cascades to profile and sessions.

### Games

- `GameProvider`: unique provider name/slug and active/inactive status.
- `Game`: unique slug, metadata, category/status enums, discovery flags, demo RTP, and provider relation.

Public game queries only return active games from active providers. Composite indexes support public status/category and discovery-flag queries; foreign keys and unique constraints protect relationship and slug integrity.

### Wallet and ledger

- `Wallet`: one row per `PLAYER`, integer VC balance, unique `userId`, and a non-negative database check constraint.
- `WalletTransaction`: append-only signed ledger with `amount`, `balanceBefore`, `balanceAfter`, server-owned idempotency key, and optional private metadata.
- `WalletTransactionType`: `WELCOME_BONUS`, `DAILY_REWARD`, `GAME_WAGER`, `GAME_WIN`, and `ADMIN_ADJUSTMENT`.
- `Favourite`: unique `(userId, gameId)` relationship between players and games.
- `RecentGame`: unique `(userId, gameId)` upserted activity row with `lastPlayedAt`.

### Phase 4 gameplay

- `GameSession`: one player/game grouping with `ACTIVE`, `COMPLETED`, or `ABANDONED` status and server-maintained wager/win/round totals.
- `GameRound`: one slots spin, blackjack hand, or roulette spin with integer wager, total-return payout, net result, status, game type, public settled result, and private active state.
- `GameAction`: an auditable action record with user/session/round ownership, action type, request hash, unique idempotency key, and response snapshot. It protects deal, hit, stand, double, slot spin, and roulette spin retries.

The Phase 4 migration also creates a partial unique index that prevents more than one pending/active round in a session and database checks for positive wagers, non-negative payouts, and `netResult = payout - wager`.

Veltrix Credits (VC) are fictional demonstration credits. They have no monetary value and cannot be purchased, transferred, redeemed or withdrawn.

Credits use positive integers and debits use negative integers. Every ledger row satisfies `balanceAfter = balanceBefore + amount`; zero amounts, negative balances, and negative ledger balances are rejected by both service validation and database checks.

### Atomicity, concurrency, and idempotency

Wallet mutations use a Prisma interactive PostgreSQL transaction. The service first locks the wallet row with `SELECT ... FOR UPDATE`, then checks the unique idempotency key, computes the next balance, updates `Wallet`, and inserts `WalletTransaction` in that same transaction. PostgreSQL row locking serializes two simultaneous debits for one player, so a balance cannot be spent twice.

Welcome credits use `welcome:<userId>`. Daily rewards use `daily:<userId>:<UTC date>` and also check for an existing `DAILY_REWARD` entry in the current UTC day while holding the wallet lock. Repeating either operation returns the existing result and does not append a duplicate.

The migration installs an append-only trigger that rejects `UPDATE` and `DELETE` on `WalletTransaction`. Corrections must be represented by a compensating transaction in a future authorized service. The migration backfills existing `PLAYER` rows with one wallet and one welcome entry; the seed repeats the check idempotently for development accounts.

### Deliberate omissions

There is no real-money balance, payment method, deposit, withdrawal, crypto, VIP, or admin wallet-adjustment workflow. `GAME_WAGER` and `GAME_WIN` are used only by the server-authoritative fictional-credit games; `ADMIN_ADJUSTMENT` remains reserved for a future authorized service.

## Seed

`prisma/seed.ts` is idempotent. It creates five fictional providers, the 15 catalogue games including Neon Relics, Veltrix Blackjack, and European Roulette, one SUPER_ADMIN, one ADMIN, and three PLAYER accounts. Every player gets a wallet and welcome entry; the first player also gets a historical daily reward, favourites, and recent games. Seed passwords can be overridden with `SEED_SUPER_ADMIN_PASSWORD`, `SEED_ADMIN_PASSWORD`, `SEED_PLAYER_PASSWORD`, `SEED_PLAYER_2_PASSWORD`, and `SEED_PLAYER_3_PASSWORD`.
