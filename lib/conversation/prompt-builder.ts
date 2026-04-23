import type { AgentDefinition } from "@/lib/agents/registry";
import type { ConversationMessage } from "@prisma/client";
import type Anthropic from "@anthropic-ai/sdk";

type BuildPromptArgs = {
  agent: AgentDefinition;
  topic: string;
  briefing?: string | null;
  summary?: string | null;
  recentMessages: ConversationMessage[];
  participantNames: string[];
  replyStyle: "tight" | "balanced";
};

export function buildSystemPrompt({
  agent,
  topic,
  briefing,
  summary,
  recentMessages,
  participantNames,
  replyStyle,
}: BuildPromptArgs): string {
  const transcriptTail = recentMessages
    .map((message) => `${message.role.toUpperCase()}${message.agentId ? `:${message.agentId}` : ""}: ${message.content}`)
    .join("\n\n");

  return [
    agent.promptBody,
    "",
    "## Multi-Agent Conversation Wrapper",
    `You are participating in a live multi-agent discussion about: ${topic}`,
    `Other participants: ${participantNames.filter((name) => name !== agent.name).join(", ") || "None"}`,
    "The user is watching the transcript in real time.",
    "Respond directly to the latest discussion, cite or challenge prior points when useful, and avoid repeating what has already been said.",
    replyStyle === "tight"
      ? "Keep your reply concise: 2 short paragraphs or 4 bullet points maximum."
      : "Keep your reply readable and moderately concise: 2-4 short paragraphs maximum.",
    briefing ? `Shared briefing:\n${briefing}` : "No shared briefing was provided.",
    summary ? `Rolling summary:\n${summary}` : "No rolling summary yet.",
    transcriptTail ? `Recent transcript:\n${transcriptTail}` : "No prior transcript yet.",
    "Close with one concrete insight, disagreement, or next angle for the next agent to react to.",
  ].join("\n");
}

export function buildUserMessage(topic: string): Anthropic.MessageParam {
  return {
    role: "user",
    content: `Continue the multi-agent discussion on: ${topic}`,
  };
}
