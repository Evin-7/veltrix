# Veltrix portfolio summary

Veltrix is a full-stack virtual-credit iGaming demonstration built to show product judgment and backend correctness without real-money gambling. It deliberately keeps the domain constrained: fictional credits only, no deposits, withdrawals, payments, crypto, or cash-out.

## What it demonstrates

- A responsive player lobby with original game presentation and a separate admin control room.
- Next.js 16 App Router, React 19, TypeScript strict mode, Tailwind CSS 4, and npm workspaces.
- Neon PostgreSQL with Prisma migrations and an idempotent fictional demo seed.
- Argon2id password hashing, hashed HttpOnly sessions, role authorization, same-origin checks, secure headers, and generic error responses.
- A server-authoritative game engine for slots, blackjack, and European roulette using cryptographic randomness.
- An append-only, row-locked VC ledger with idempotency and concurrency tests.
- Promotions, VIP progression, responsible-gaming controls, notifications, SSE display updates, and auditable admin operations.
- Production-oriented hardening: shared Upstash rate limiting, bounded reads, JSON logs, request correlation, CI, and Playwright journeys.

## Architecture decisions

The existing PostgreSQL/Prisma architecture remains the source of truth. REST route handlers and database transactions own identity, wallet balances, gameplay outcomes, eligibility, and admin mutations. SSE is used only as a display convenience because the current realtime requirements are one-way snapshots; the UI can always recover from REST and PostgreSQL.

## Trade-offs and limitations

- The game randomness is appropriate for a portfolio demo, not independently certified real-money gaming software.
- Local development can use an in-memory limiter for simplicity; production requires the shared Upstash REST variables.
- A hosted monitoring provider is not wired in; the log schema and request IDs are ready for a Vercel drain, Sentry, or OpenTelemetry collector.
- Playwright E2E tests intentionally require an explicit disposable Neon branch and credentials so normal CI cannot mutate shared data.

See [ARCHITECTURE.md](./ARCHITECTURE.md), [SECURITY.md](./SECURITY.md), [DEPLOYMENT.md](./DEPLOYMENT.md), and [DIAGRAMS.md](./DIAGRAMS.md) for implementation details.
