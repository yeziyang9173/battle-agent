"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AgentDefinition } from "@/lib/agents/registry";
import { AgentPicker } from "@/components/agent-picker";
import { TopicComposer } from "@/components/topic-composer";
import { RunConfigPanel } from "@/components/run-config-panel";

type SetupPageClientProps = {
  agents: AgentDefinition[];
};

export function SetupPageClient({ agents }: SetupPageClientProps) {
  const router = useRouter();
  const [topic, setTopic] = useState("Discuss recent developments in the agent ecosystem");
  const [briefing, setBriefing] = useState("");
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>(() =>
    agents.filter((agent) => ["agents-orchestrator", "trend-researcher", "tool-evaluator"].includes(agent.slug)).slice(0, 3).map((agent) => agent.id),
  );
  const [maxTurns, setMaxTurns] = useState(10);
  const [replyStyle, setReplyStyle] = useState<"tight" | "balanced">("balanced");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCount = selectedAgentIds.length;
  const featuredAgents = useMemo(
    () => agents.filter((agent) => selectedAgentIds.includes(agent.id)),
    [agents, selectedAgentIds],
  );

  const toggleAgent = (agentId: string) => {
    setSelectedAgentIds((current) =>
      current.includes(agentId) ? current.filter((id) => id !== agentId) : [...current, agentId],
    );
  };

  const handleSubmit = async () => {
    if (selectedAgentIds.length < 2) {
      setError("Select at least two agents.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          briefing,
          selectedAgentIds,
          maxTurns,
          replyStyle,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create run.");
      }

      router.push(`/runs/${data.run.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to create run.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-8 px-6 py-10 lg:px-10">
      <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
        <div>
          <div className="mb-4 flex items-center gap-3 text-xs uppercase tracking-[0.34em] text-signal">
            <span className="signal-dot" />
            Agency Signals
          </div>
          <h1 className="max-w-4xl font-display text-5xl leading-[0.95] text-white md:text-7xl">
            Stage a visible argument between your best agents.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-white/68 md:text-lg">
            This UI turns the repository’s markdown personas into a live conversation room: one shared brief, multiple agents, and a transcript the user can watch as it unfolds.
          </p>
        </div>

        <div className="shell rounded-[36px] p-6">
          <div className="text-xs uppercase tracking-[0.32em] text-white/45">Selected cast</div>
          <div className="mt-4 flex flex-wrap gap-3">
            {featuredAgents.length > 0 ? (
              featuredAgents.map((agent) => (
                <div key={agent.id} className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/80">
                  {agent.emoji} {agent.name}
                </div>
              ))
            ) : (
              <div className="text-sm text-white/55">Pick at least two agents to start a run.</div>
            )}
          </div>
          <div className="mt-6 border-t border-white/10 pt-4 text-sm text-white/60">
            {selectedCount} participant{selectedCount === 1 ? "" : "s"} ready.
          </div>
        </div>
      </section>

      <section className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="grid gap-8">
          <TopicComposer
            topic={topic}
            briefing={briefing}
            onTopicChange={setTopic}
            onBriefingChange={setBriefing}
          />
          <RunConfigPanel
            maxTurns={maxTurns}
            replyStyle={replyStyle}
            onMaxTurnsChange={setMaxTurns}
            onReplyStyleChange={setReplyStyle}
          />
        </div>

        <div className="grid gap-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.32em] text-white/45">Agent roster</div>
              <div className="mt-2 font-display text-3xl">Choose the room</div>
            </div>
            <a href="/history" className="text-sm uppercase tracking-[0.24em] text-white/55 transition hover:text-white">
              History
            </a>
          </div>
          <AgentPicker agents={agents} selectedAgentIds={selectedAgentIds} onToggle={toggleAgent} />
        </div>
      </section>

      <section className="flex items-center justify-between gap-4 rounded-[32px] border border-white/10 bg-white/[0.04] px-6 py-5">
        <div>
          <div className="text-xs uppercase tracking-[0.32em] text-white/45">Launch</div>
          <div className="mt-2 text-sm text-white/65">
            Create a run, then start it from the live page to watch the transcript stream in.
          </div>
          {error ? <div className="mt-3 text-sm text-ember">{error}</div> : null}
        </div>
        <button
          type="button"
          disabled={submitting}
          onClick={handleSubmit}
          className="rounded-full border border-signal/40 bg-signal/10 px-6 py-3 text-sm uppercase tracking-[0.28em] text-signal disabled:opacity-50"
        >
          {submitting ? "Creating" : "Create run"}
        </button>
      </section>
    </main>
  );
}
