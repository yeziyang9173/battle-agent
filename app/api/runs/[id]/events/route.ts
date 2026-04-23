import { prisma } from "@/lib/db/prisma";
import { subscribeToRun } from "@/lib/events/pubsub";

function encodeSse(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const existingEvents = await prisma.conversationEvent.findMany({
    where: { runId: id },
    orderBy: { seq: "asc" },
  });

  const encoder = new TextEncoder();
  let unsubscribe = () => {};
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const event of existingEvents) {
        controller.enqueue(
          encoder.encode(
            encodeSse(event.type, {
              seq: event.seq,
              type: event.type,
              payload: JSON.parse(event.payload),
              createdAt: event.createdAt.toISOString(),
            }),
          ),
        );
      }

      unsubscribe = subscribeToRun(id, (event) => {
        controller.enqueue(encoder.encode(encodeSse(event.type, event)));
      });

      heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(": keepalive\n\n"));
      }, 15000);
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
