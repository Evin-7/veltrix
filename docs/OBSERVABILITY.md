# Observability and incident handling

Veltrix uses small, dependency-free primitives that work in Next.js serverless runtimes:

- API responses include `X-Request-ID`.
- API middleware accepts a safe incoming request ID or generates a UUID.
- Unexpected API failures emit one-line JSON with timestamp, service, level, event, status, code, and request ID.
- Logs never include cookies, credentials, database URLs, request bodies, or stack traces.
- The same pattern is used for rate-limit dependency failures and seed CLI completion/failure events.

Example event shape (values are illustrative):

```json
{"timestamp":"2026-01-01T00:00:00.000Z","service":"veltrix-web","level":"error","event":"api.request_failed","requestId":"request-id","status":500,"code":"INTERNAL_ERROR"}
```

Vercel’s runtime logs can be shipped to a log drain or external monitoring system. A Sentry/OpenTelemetry integration is intentionally not bundled: it would add provider-specific cost and configuration without being needed for this portfolio deployment. If added later, keep error scrubbing enabled and preserve the request ID as the correlation field.

Operational signals to alert on:

- repeated `api.request_failed` events;
- `rate_limit.store_unavailable` or `RATE_LIMIT_UNAVAILABLE` responses;
- elevated 5xx responses or Neon connection failures;
- authentication failure spikes and audit-log mutation volume;
- slow dashboard or game-round transactions.

The user-facing error page and API errors are intentionally generic. Use the request ID from the response and hosting logs for diagnosis; never ask a user to send credentials or raw environment files.
