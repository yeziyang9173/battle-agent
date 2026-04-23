import { NextResponse } from "next/server";
import { stopRun } from "@/lib/conversation/orchestrator";
import { persistEvent } from "@/lib/conversation/store";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const run = await stopRun(id);

  if (!run) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }

  await persistEvent(id, "run.stopped", { runId: id });
  return NextResponse.json({ run });
}
