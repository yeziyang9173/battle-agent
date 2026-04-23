export type RunConfig = {
  maxTurns: number;
  replyStyle: "tight" | "balanced";
};

export function parseRunConfig(raw: string | null | undefined): RunConfig {
  if (!raw) {
    return { maxTurns: 10, replyStyle: "balanced" };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<RunConfig>;
    return {
      maxTurns: typeof parsed.maxTurns === "number" ? parsed.maxTurns : 10,
      replyStyle: parsed.replyStyle === "tight" ? "tight" : "balanced",
    };
  } catch {
    return { maxTurns: 10, replyStyle: "balanced" };
  }
}

export function stringifyRunConfig(config: RunConfig) {
  return JSON.stringify(config);
}
