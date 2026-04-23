export type AppEventType =
  | "run.created"
  | "run.started"
  | "run.status"
  | "turn.started"
  | "message.delta"
  | "message.completed"
  | "run.stopped"
  | "run.completed"
  | "run.failed";

export type StreamEvent<T = unknown> = {
  seq: number;
  type: AppEventType;
  payload: T;
  createdAt: string;
};
