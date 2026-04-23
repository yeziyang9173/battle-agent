import { RunStatus } from "@prisma/client";

export function isTerminalStatus(status: RunStatus) {
  return status === "completed" || status === "stopped" || status === "failed";
}

export function shouldStopForRepetition(recentMessages: string[]) {
  if (recentMessages.length < 3) return false;
  const normalized = recentMessages.map((message) =>
    message
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim(),
  );
  const [latest, prev, beforePrev] = normalized.slice(-3);
  return latest === prev || latest === beforePrev;
}

export function shouldStopForConvergence(recentMessages: string[]) {
  if (recentMessages.length < 2) return false;
  return recentMessages.slice(-2).every((message) =>
    /discussion (has )?(converged|settled)|nothing substantial to add|final takeaway/i.test(message),
  );
}
