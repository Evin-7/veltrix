# Veltrix Admin Control Room

The Phase 5 back office is a separate Next.js workspace at `apps/admin`. It is a browser UI only; the existing `apps/web` app remains the single Prisma, session, wallet, and API boundary.

## Local development

1. Configure the root `.env` and `apps/web/.env.local` with the same local values from `.env.example`, including the existing Neon `DATABASE_URL` and `DIRECT_DATABASE_URL`.
2. Set `ADMIN_APP_URL=http://localhost:3001` in the web environment.
3. Copy `apps/admin/.env.example` to `apps/admin/.env.local` if the API is not running at its default URL.
4. Start the player API/app with `npm run dev`.
5. Start the control room in another terminal with `npm run dev:admin`.
6. Open `http://localhost:3001` and sign in with an `ADMIN` or `SUPER_ADMIN` account.

The admin origin is explicitly checked by the API. In deployment, set `ADMIN_APP_URL` to the exact browser origin or place both apps behind a same-origin reverse proxy. Do not use `*` CORS and do not put credentials in the admin app bundle.

## Permissions

- `ADMIN`: dashboard, players, read-only wallet/session/transaction/audit exploration, game/provider metadata and availability management.
- `SUPER_ADMIN`: all `ADMIN` capabilities plus compensating VC adjustments.
- `PLAYER`: never authorized for admin routes; the API returns `403`.

Phase 6 adds promotion lifecycle management for `ADMIN`/`SUPER_ADMIN`, read-only reward history and VIP configuration access for both admin roles, SUPER_ADMIN-only VIP configuration mutations, and read-only responsible-gaming inspection. Responsible-gaming inspection has no override action.

The UI is not the security boundary. Every route under `/api/v1/admin` calls the existing `getCurrentUser`/`requireAuth` session logic and `requireRole` independently.

## Operational safeguards

- Player disable is transactional and revokes active sessions.
- Wallet adjustments require `Idempotency-Key`, a signed non-zero integer, a reason, a player target, and the existing PostgreSQL wallet lock/ledger service.
- Every adjustment, player status change, and catalog/provider mutation writes an append-only `AuditLog` record.
- Transactions, sessions, rounds, actions, wallet history, and game outcomes are read-only from the admin API.
- Providers are disabled rather than deleted so historical foreign-key references remain valid.
- New games are created inactive; changing a game slug is not allowed through the update API because gameplay routes depend on stable slugs.
- Promotion claims remain player-owned and are never issued from an admin screen; admin promotion changes are audited.

## Verification

```bash
npm run db:generate
npm run db:migrate:deploy
npm run db:seed
npm run typecheck
npm run lint
npm test
npm run build
```

Run the web app and admin app together for smoke checks. Do not run Prisma reset commands against Neon.
