import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropicClient } from "@/lib/providers/anthropic";

export type StreamHandlers = {
  onTextDelta?: (delta: string) => Promise<void> | void;
};

type StreamRequest = {
  model: string;
  max_tokens: number;
  messages: Anthropic.MessageParam[];
  system?: Anthropic.MessageCreateParams["system"];
  thinking?: unknown;
  output_config?: unknown;
};

export async function streamAgentReply(
  request: StreamRequest,
  handlers: StreamHandlers = {},
) {
  const client = getAnthropicClient();
  const stream = client.messages.stream({
    ...request,
    stream: true,
  } as Anthropic.MessageStreamParams);

  stream.on("text", (delta) => {
    void handlers.onTextDelta?.(delta);
  });

  return stream.finalMessage();
}
