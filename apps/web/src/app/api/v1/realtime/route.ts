import { requireAuth } from "@/server/auth/session";
import { requireRole } from "@/server/auth/authorization";
import { getRealtimeSnapshot } from "@/server/realtime/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const streamHeaders = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};

function emptySnapshot() {
  return `event: snapshot\ndata: ${JSON.stringify({ walletBalance: null, unreadNotifications: 0, activeSession: null, emittedAt: new Date().toISOString() })}\n\n`;
}

export async function GET(request: Request) {
  let user;
  try {
    user = requireRole(await requireAuth(), ["PLAYER"]);
  } catch {
    return new Response(emptySnapshot(), { headers: streamHeaders });
  }
  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | undefined;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = async (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };
      try {
        await send("snapshot", await getRealtimeSnapshot(user.id));
      } catch {
        await send("snapshot", {
          walletBalance: null,
          unreadNotifications: 0,
          activeSession: null,
          emittedAt: new Date().toISOString(),
        });
      }
      timer = setInterval(async () => {
        if (request.signal.aborted) {
          if (timer) clearInterval(timer);
          controller.close();
          return;
        }
        try {
          await send("snapshot", await getRealtimeSnapshot(user.id));
        } catch {
          await send("error", { message: "Realtime snapshot unavailable." });
        }
      }, 10_000);
    },
    cancel() {
      if (timer) clearInterval(timer);
    },
  });
  return new Response(stream, { headers: streamHeaders });
}
