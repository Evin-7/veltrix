# Deployment guide

Veltrix is prepared for a two-project Vercel deployment backed by one Neon PostgreSQL database. The player app and admin app share the web app’s session cookie and versioned API; they are separate Next.js frontends, not separate databases or auth systems.

## Recommended Vercel setup

Create two Vercel projects linked to the same repository:

| Project | App | Build command | Runtime URL |
| --- | --- | --- | --- |
| Veltrix Web | `apps/web` | `npm run build:web` from the repository root | Player-facing URL |
| Veltrix Admin | `apps/admin` | `npm run build:admin` from the repository root | Restricted operations URL |

Use the repository root as the install/build working directory when Vercel’s monorepo settings allow it. If the dashboard requires an app root, keep the workspace lockfile available and use the equivalent workspace build command. Verify the generated deployment starts the intended app before attaching a custom domain.

## Environment variables

Set production values in Vercel project settings, never in Git:

Player project:

- `DATABASE_URL`: Neon pooled runtime connection (`-pooler` host, SSL required).
- `DIRECT_DATABASE_URL`: Neon direct connection for trusted migration/seed commands; do not use it for normal request traffic.
- `AUTH_SECRET`: independently generated secret of at least 32 characters; rotate through a planned session invalidation event.
- `APP_URL`: deployed player URL, including `https://` and no trailing slash.
- `ADMIN_APP_URL`: deployed admin URL, including `https://` and no trailing slash.
- `NODE_ENV=production`.
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`: required together for shared rate limiting across serverless instances.

Admin project:

- `NEXT_PUBLIC_ADMIN_API_URL`: deployed player/web URL that hosts `/api/v1/admin`.

The application validates runtime variables in `apps/web/src/server/env.ts`. `DIRECT_DATABASE_URL` is consumed by Prisma CLI tooling and is intentionally not required by request handlers.

## Database release sequence

Run migrations from a trusted release environment with `DIRECT_DATABASE_URL`:

```bash
npx prisma generate
npx prisma migrate deploy
```

`migrate deploy` applies committed migrations and does not reset, drop, or recreate the Neon database. Do not run `migrate dev`, `migrate reset`, or `db push` against production. Keep schema changes additive and review the generated SQL before release.

The seed is for local or disposable demo branches. Production seeding is blocked unless every `SEED_*_PASSWORD` is explicitly injected and `VELTRIX_SEED_ENV=production` is intentional. Do not use the local fallback passwords in any deployed environment.

## Neon and operational safety

- Use a pooled URL for application requests and the direct URL for migrations.
- Keep SSL enabled and use Neon branches for previews or E2E tests.
- Never point CI or a preview at the primary production branch when a disposable branch is available.
- Do not reset or destroy a shared branch during deployment.
- Rotate database credentials and `AUTH_SECRET` through the hosting secret manager.
- Restrict the admin URL with access controls at the hosting or identity layer in addition to application roles.

## Health checks and monitoring

After deployment, verify `/`, `/casino`, `/login`, `/register`, `/api/v1/games`, and the admin login page. Confirm the response includes `X-Request-ID`, Vercel logs contain JSON events, and a failed database/rate-limit dependency returns a generic recovery message without stack traces. See [OBSERVABILITY.md](./OBSERVABILITY.md).
