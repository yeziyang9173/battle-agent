import { loadAgents } from "@/lib/agents/registry";
import { SetupPageClient } from "@/components/setup-page-client";

export default async function HomePage() {
  const agents = await loadAgents();
  return <SetupPageClient agents={agents} />;
}
