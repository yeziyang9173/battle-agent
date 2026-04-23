import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const run = await prisma.conversationRun.findUnique({
    where: { id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      events: { orderBy: { seq: "asc" } },
    },
  });

  if (!run) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }

  return NextResponse.json({ run });
}
