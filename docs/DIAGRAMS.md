# Veltrix architecture diagrams

These diagrams describe the current Phase 1–7 system. PostgreSQL/Neon and Prisma remain the source of truth; browser state is never authoritative for identity, wallet balance, eligibility, or game outcomes.

## Overall request flow

```mermaid
flowchart LR
  Player[Player browser] --> Web[apps/web Next.js]
  Admin[Admin browser] --> AdminUI[apps/admin Next.js]
  AdminUI -->|credentialed CORS| Web
  Web --> Routes[Versioned Route Handlers]
  Routes --> Services[Auth · wallet · games · product services]
  Services --> Prisma[Prisma Client]
  Prisma --> Neon[(Neon PostgreSQL)]
  Routes --> Rate[Upstash REST rate limiter]
  Routes --> Logs[JSON logs + request ID]
```

## Authentication and session lifecycle

```mermaid
sequenceDiagram
  participant B as Browser
  participant R as Route handler
  participant DB as Neon PostgreSQL
  B->>R: Register/login credentials
  R->>R: Zod validation + rate limit + same-origin check
  R->>DB: Find user + verify Argon2id hash
  R->>DB: Create hashed-token session
  R-->>B: HttpOnly SameSite cookie + safe user
  B->>R: Authenticated request
  R->>DB: Hash cookie token + verify active session
  R-->>B: Authorized response
```

## Wallet and ledger mutation

```mermaid
sequenceDiagram
  participant B as Browser
  participant G as Gameplay/service transaction
  participant DB as Neon PostgreSQL
  B->>G: Wager/action + Idempotency-Key
  G->>DB: Lock wallet row FOR UPDATE
  G->>DB: Check ownership, limits, cool-off/self-exclusion
  G->>DB: Check idempotency key
  G->>DB: Append signed ledger entry
  G->>DB: Update wallet balance + round/session totals
  DB-->>G: Committed authoritative result
  G-->>B: Stored response snapshot
```

## Server-authoritative game round

```mermaid
flowchart TD
  Request[Permitted wager + idempotency key] --> Guard[Auth · role · limits · responsible gaming]
  Guard --> Lock[Transaction + wallet row lock]
  Lock --> Replay{Existing action key?}
  Replay -->|yes| Stored[Return stored response]
  Replay -->|no| RNG[Node cryptographic randomness]
  RNG --> Engine[Pure game engine]
  Engine --> Settlement[Ledger wager/win + round state]
  Settlement --> StoredResponse[Persist response snapshot]
  StoredResponse --> Browser[Return result to browser]
```

## Admin authorization and audit

```mermaid
sequenceDiagram
  participant A as Admin browser
  participant API as Web admin API
  participant DB as Neon PostgreSQL
  A->>API: Request with session cookie + Origin
  API->>API: Validate admin origin, shared rate limit, session, role
  API->>DB: Read or execute allowlisted operation
  API->>DB: For mutations, append AuditLog in same transaction
  DB-->>API: Result
  API-->>A: Data envelope + request ID
```
