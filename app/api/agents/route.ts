import { NextResponse } from "next/server";
import { loadAgents } from "@/lib/agents/registry";

export async function GET() {
  const agents = await loadAgents();
  return NextResponse.json({ agents });
}
