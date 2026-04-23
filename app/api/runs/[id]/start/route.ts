import { NextResponse } from "next/server";
import { startOrchestrator } from "@/lib/conversation/orchestrator";
import { prisma } from "@/lib/db/prisma";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const run = await prisma.conversationRun.findUnique({ where: { id } });

  if (!run) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }

  if (run.status === "running") {
    return NextResponse.json({ run });
  }

  void startOrchestrator(id);
  return NextResponse.json({ ok: true });
}
