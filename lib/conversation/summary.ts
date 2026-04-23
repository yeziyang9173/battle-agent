export function summarizeMessages(messages: { agentId: string | null; content: string }[]) {
  if (messages.length === 0) return "";

  return messages
    .slice(-6)
    .map((message) => {
      const text = message.content.replace(/\s+/g, " ").trim();
      const clipped = text.length > 220 ? `${text.slice(0, 217)}...` : text;
      return `${message.agentId ?? "system"}: ${clipped}`;
    })
    .join("\n");
}
