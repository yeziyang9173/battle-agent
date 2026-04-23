import { RunStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { publishEvent } from "@/lib/events/pubsub";
import type { AppEventType } from "@/lib/events/types";

export async function persistEvent(runId: string, type: AppEventType, payload: unknown) {
  const seq = (await prisma.conversationEvent.count({ where: { runId } })) + 1;
  const event = await prisma.conversationEvent.create({
    data: {
      runId,
      seq,
      type,
      payload: JSON.stringify(payload),
    },
  });

  publishEvent({
    runId,
    seq: event.seq,
    type,
    payload,
    createdAt: event.createdAt.toISOString(),
  });

  return event;
}

export async function updateRunStatus(runId: string, status: RunStatus) {
  const now = new Date();
  const run = await prisma.conversationRun.update({
    where: { id: runId },
    data: {
      status,
      startedAt: status === "running" ? now : undefined,
      completedAt: status === "completed" || status === "stopped" || status === "failed" ? now : undefined,
    },
  });

  await persistEvent(runId, "run.status", {
    status,
    turnCount: run.turnCount,
  });

  return run;
}
