import { RunStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getAgentById, type AgentDefinition } from "@/lib/agents/registry";
import { parseRunConfig } from "@/lib/conversation/config";
import { buildSystemPrompt, buildUserMessage } from "@/lib/conversation/prompt-builder";
import { summarizeMessages } from "@/lib/conversation/summary";
import {
  isTerminalStatus,
  shouldStopForConvergence,
  shouldStopForRepetition,
} from "@/lib/conversation/stop-conditions";
import { persistEvent, updateRunStatus } from "@/lib/conversation/store";
import { streamAgentReply } from "@/lib/providers/llm";

const activeRuns = new Map<string, Promise<void>>();

async function appendMessage(runId: string, turnIndex: number, agentId: string, content: string) {
  return prisma.conversationMessage.create({
    data: {
      runId,
      turnIndex,
      agentId,
      role: "agent",
      content,
    },
  });
}

async function getRecentMessages(runId: string) {
  return prisma.conversationMessage.findMany({
    where: { runId },
    orderBy: { createdAt: "asc" },
    take: 50,
  });
}

export async function stopRun(runId: string) {
  const run = await prisma.conversationRun.findUnique({ where: { id: runId } });
  if (!run || isTerminalStatus(run.status)) return run;
  return updateRunStatus(runId, "stopped");
}

export async function startOrchestrator(runId: string) {
  if (activeRuns.has(runId)) return activeRuns.get(runId)!;

  const job = runConversation(runId).finally(() => {
    activeRuns.delete(runId);
  });
  activeRuns.set(runId, job);
  return job;
}

async function runConversation(runId: string) {
  const run = await prisma.conversationRun.findUnique({ where: { id: runId } });
  if (!run) throw new Error(`Run ${runId} not found`);
  if (isTerminalStatus(run.status)) return;

  const selectedAgentIds = JSON.parse(run.selectedAgentIds) as string[];
  if (selectedAgentIds.length < 2) {
    await updateRunStatus(runId, "failed");
    throw new Error("At least two agents are required.");
  }

  const agents = await Promise.all(selectedAgentIds.map((id) => getAgentById(id)));
  if (agents.some((agent) => !agent)) {
    await updateRunStatus(runId, "failed");
    throw new Error("One or more selected agents could not be loaded.");
  }

  const resolvedAgents = agents as AgentDefinition[];
  const config = parseRunConfig(run.config);

  await updateRunStatus(runId, "running");
  await persistEvent(runId, "run.started", { runId, maxTurns: run.maxTurns });

  for (let turnIndex = run.turnCount; turnIndex < run.maxTurns; turnIndex += 1) {
    const freshRun = await prisma.conversationRun.findUnique({ where: { id: runId } });
    if (!freshRun || freshRun.status !== RunStatus.running) break;

    const speaker = resolvedAgents[turnIndex % resolvedAgents.length] as AgentDefinition;
    const recentMessages = await getRecentMessages(runId);
    const summary = summarizeMessages(recentMessages);

    await persistEvent(runId, "turn.started", {
      runId,
      turnIndex,
      speaker: {
        id: speaker.id,
        name: speaker.name,
        color: speaker.color,
      },
    });

    const system = buildSystemPrompt({
      agent: speaker,
      topic: run.topic,
      briefing: run.briefing,
      summary,
      recentMessages,
      participantNames: resolvedAgents.map((agent) => agent.name),
      replyStyle: config.replyStyle,
    });

    let content = "";

    try {
      const finalMessage = await streamAgentReply(
        {
          model: "claude-opus-4-6",
          max_tokens: config.replyStyle === "tight" ? 500 : 900,
          thinking: { type: "adaptive" } as never,
          output_config: { effort: "medium" },
          system,
          messages: [buildUserMessage(run.topic)],
        },
        {
          onTextDelta: async (delta) => {
            content += delta;
            await persistEvent(runId, "message.delta", {
              turnIndex,
              agentId: speaker.id,
              delta,
            });
          },
        },
      );

      if (!content) {
        content = finalMessage.content
          .filter((block) => block.type === "text")
          .map((block) => block.text)
          .join("\n");
      }

      const saved = await appendMessage(runId, turnIndex, speaker.id, content.trim());
      await prisma.conversationRun.update({
        where: { id: runId },
        data: { turnCount: turnIndex + 1 },
      });

      await persistEvent(runId, "message.completed", {
        turnIndex,
        message: {
          id: saved.id,
          agentId: speaker.id,
          content: saved.content,
          createdAt: saved.createdAt.toISOString(),
        },
      });

      const latestMessages = [...recentMessages.map((message) => message.content), saved.content];
      if (
        turnIndex + 1 >= run.maxTurns ||
        shouldStopForRepetition(latestMessages) ||
        shouldStopForConvergence(latestMessages)
      ) {
        await updateRunStatus(runId, "completed");
        await persistEvent(runId, "run.completed", { turnCount: turnIndex + 1 });
        return;
      }
    } catch (error) {
      await updateRunStatus(runId, "failed");
      await persistEvent(runId, "run.failed", {
        message: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  const endedRun = await prisma.conversationRun.findUnique({ where: { id: runId } });
  if (endedRun?.status === "running") {
    await updateRunStatus(runId, "completed");
    await persistEvent(runId, "run.completed", { turnCount: endedRun.turnCount });
  }
}
