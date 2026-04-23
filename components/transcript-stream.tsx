"use client";

import { useEffect, useMemo, useRef } from "react";
import { TranscriptMessage } from "@/components/transcript-message";
import type { AgentDefinition } from "@/lib/agents/registry";

type MessageItem = {
  id: string;
  agentId: string | null;
  content: string;
  createdAt: string;
};

type DraftItem = {
  agentId: string;
  content: string;
};

type TranscriptStreamProps = {
  agents: AgentDefinition[];
  messages: MessageItem[];
  draft?: DraftItem | null;
};

export function TranscriptStream({ agents, messages, draft }: TranscriptStreamProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const agentMap = useMemo(() => new Map(agents.map((agent) => [agent.id, agent])), [agents]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, draft]);

  return (
    <div ref={containerRef} className="transcript-mask flex max-h-[72vh] flex-col gap-4 overflow-y-auto pr-2">
      {messages.map((message) => {
        const agent = message.agentId ? agentMap.get(message.agentId) : null;
        return (
          <TranscriptMessage
            key={message.id}
            name={agent?.name ?? "System"}
            emoji={agent?.emoji}
            color={agent?.color ?? "#97F4FF"}
            content={message.content}
            createdAt={message.createdAt}
          />
        );
      })}
      {draft ? (
        <TranscriptMessage
          name={agentMap.get(draft.agentId)?.name ?? "Streaming"}
          emoji={agentMap.get(draft.agentId)?.emoji}
          color={agentMap.get(draft.agentId)?.color ?? "#97F4FF"}
          content={draft.content}
          isStreaming
        />
      ) : null}
    </div>
  );
}
