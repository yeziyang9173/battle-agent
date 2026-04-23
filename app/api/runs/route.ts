import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { stringifyRunConfig } from "@/lib/conversation/config";
import { persistEvent } from "@/lib/conversation/store";

export async function GET() {
  const runs = await prisma.conversationRun.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });

  return NextResponse.json({ runs });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    topic?: string;
    briefing?: string;
    selectedAgentIds?: string[];
    maxTurns?: number;
    replyStyle?: "tight" | "balanced";
  };

  if (!body.topic?.trim()) {
    return NextResponse.json({ error: "Topic is required." }, { status: 400 });
  }

  if (!body.selectedAgentIds || body.selectedAgentIds.length < 2) {
    return NextResponse.json({ error: "Select at least two agents." }, { status: 400 });
  }

  const title = body.topic.trim().slice(0, 80);
  const run = await prisma.conversationRun.create({
    data: {
      title,
      topic: body.topic.trim(),
      briefing: body.briefing?.trim() || null,
      maxTurns: Math.min(Math.max(body.maxTurns ?? 10, 2), 20),
      selectedAgentIds: JSON.stringify(body.selectedAgentIds),
      config: stringifyRunConfig({
        maxTurns: Math.min(Math.max(body.maxTurns ?? 10, 2), 20),
        replyStyle: body.replyStyle === "tight" ? "tight" : "balanced",
      }),
    },
  });

  await persistEvent(run.id, "run.created", {
    runId: run.id,
    topic: run.topic,
    selectedAgentIds: body.selectedAgentIds,
  });

  return NextResponse.json({ run }, { status: 201 });
}
