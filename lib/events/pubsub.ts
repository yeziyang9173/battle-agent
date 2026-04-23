import { EventEmitter } from "node:events";
import type { StreamEvent } from "@/lib/events/types";

const emitter = new EventEmitter();
emitter.setMaxListeners(200);

function key(runId: string) {
  return `run:${runId}`;
}

export function publishEvent(event: StreamEvent & { runId: string }) {
  emitter.emit(key(event.runId), event);
}

export function subscribeToRun(runId: string, listener: (event: StreamEvent & { runId: string }) => void) {
  const channel = key(runId);
  emitter.on(channel, listener);
  return () => emitter.off(channel, listener);
}
