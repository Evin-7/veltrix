# Realtime updates

Veltrix uses authenticated Server-Sent Events (SSE) at `GET /api/v1/realtime` for lightweight one-way display updates.

The stream is scoped entirely from the `veltrix_session` cookie. It accepts no user ID, emits a safe snapshot of wallet balance, unread notification count, and active game session, and polls authoritative PostgreSQL-backed state every ten seconds. The web app uses it to refresh the header balance, notification badge, and session reminder context.

The stream is deliberately not an integrity boundary. Gameplay, promotion claims, responsible-gaming enforcement, and wallet changes use normal authenticated REST requests and Prisma transactions. A stale, disconnected, or unavailable SSE connection cannot authorize a request or change financial state. The current one-way requirement does not justify introducing Socket.IO or a message broker; those can be evaluated if future requirements need server-to-client fanout at scale or client-to-server presence.
