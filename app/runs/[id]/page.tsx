import { notFound } from "next/navigation";
import { loadAgents } from "@/lib/agents/registry";
import { prisma } from "@/lib/db/prisma";
import { RunPageClient } from "@/components/run-page-client";

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = await prisma.conversationRun.findUnique({
    where: { id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!run) {
    notFound();
  }

  const agentIds = JSON.parse(run.selectedAgentIds) as string[];
  const agents = (await loadAgents()).filter((agent) => agentIds.includes(agent.id));

  return (
    <RunPageClient
      run={{
        id: run.id,
        title: run.title,
        topic: run.topic,
        briefing: run.briefing,
        status: run.status,
        maxTurns: run.maxTurns,
        turnCount: run.turnCount,
        messages: run.messages.map((message) => ({
          id: message.id,
          agentId: message.agentId,
          content: message.content,
          createdAt: message.createdAt.toISOString(),
        })),
      }}
      agents={agents}
    />
  );
}
