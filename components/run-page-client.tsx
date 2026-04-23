"use client";

import { useEffect, useMemo, useState } from "react";
import type { AgentDefinition } from "@/lib/agents/registry";
import { ParticipantList } from "@/components/participant-list";
import { RunStatusPanel } from "@/components/run-status-panel";
import { TranscriptStream } from "@/components/transcript-stream";

type RunPageClientProps = {
  run: {
    id: string;
    title: string;
    topic: string;
    briefing: string | null;
    status: string;
    maxTurns: number;
    turnCount: number;
    messages: Array<{
      id: string;
      agentId: string | null;
      content: string;
      createdAt: string;
    }>;
  };
  agents: AgentDefinition[];
};

type DraftState = {
  agentId: string;
  content: string;
} | null;

export function RunPageClient({ run, agents }: RunPageClientProps) {
  const [status, setStatus] = useState(run.status);
  const [turnCount, setTurnCount] = useState(run.turnCount);
  const [messages, setMessages] = useState(run.messages);
  const [draft, setDraft] = useState<DraftState>(null);
  const [currentSpeakerId, setCurrentSpeakerId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const agentMap = useMemo(() => new Map(agents.map((agent) => [agent.id, agent])), [agents]);

  useEffect(() => {
    const source = new EventSource(`/api/runs/${run.id}/events`);

    const onTurnStarted = (event: MessageEvent<string>) => {
      const data = JSON.parse(event.data) as { payload: { speaker: { id: string } } };
      setCurrentSpeakerId(data.payload.speaker.id);
      setDraft({ agentId: data.payload.speaker.id, content: "" });
    };

    const onMessageDelta = (event: MessageEvent<string>) => {
      const data = JSON.parse(event.data) as { payload: { agentId: string; delta: string } };
      setDraft((current) => {
        const base = current && current.agentId === data.payload.agentId ? current.content : "";
        return { agentId: data.payload.agentId, content: base + data.payload.delta };
      });
    };

    const onMessageCompleted = (event: MessageEvent<string>) => {
      const data = JSON.parse(event.data) as {
        payload: {
          message: { id: string; agentId: string; content: string; createdAt: string };
        };
      };
      setMessages((current) => [...current, data.payload.message]);
      setTurnCount((current) => current + 1);
      setDraft(null);
    };

    const onRunStatus = (event: MessageEvent<string>) => {
      const data = JSON.parse(event.data) as { payload: { status: string; turnCount: number } };
      setStatus(data.payload.status);
      setTurnCount(data.payload.turnCount);
    };

    const onRunCompleted = () => {
      setDraft(null);
      setCurrentSpeakerId(null);
      setBusy(false);
    };

    source.addEventListener("turn.started", onTurnStarted);
    source.addEventListener("message.delta", onMessageDelta);
    source.addEventListener("message.completed", onMessageCompleted);
    source.addEventListener("run.status", onRunStatus);
    source.addEventListener("run.completed", onRunCompleted);
    source.addEventListener("run.stopped", onRunCompleted);
    source.addEventListener("run.failed", onRunCompleted);

    return () => {
      source.close();
    };
  }, [run.id]);

  const handleStart = async () => {
    setBusy(true);
    await fetch(`/api/runs/${run.id}/start`, { method: "POST" });
  };

  const handleStop = async () => {
    setBusy(true);
    await fetch(`/api/runs/${run.id}/stop`, { method: "POST" });
    setBusy(false);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1700px] flex-col gap-8 px-6 py-10 lg:px-10">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="mb-4 flex items-center gap-3 text-xs uppercase tracking-[0.34em] text-signal">
            <span className="signal-dot" />
            Live run
          </div>
          <h1 className="font-display text-5xl leading-tight md:text-6xl">{run.title}</h1>
          <p className="mt-4 max-w-4xl text-base leading-8 text-white/68">{run.topic}</p>
        </div>
        <div className="text-sm uppercase tracking-[0.22em] text-white/45">
          <a href="/" className="mr-4 hover:text-white">New run</a>
          <a href="/history" className="hover:text-white">History</a>
        </div>
      </header>

      <section className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        <ParticipantList agents={agents} currentSpeakerId={currentSpeakerId} />

        <div className="shell rounded-[32px] p-5 md:p-7">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.32em] text-white/45">Transcript</div>
              <div className="mt-2 font-display text-3xl">Conversation feed</div>
            </div>
            <div className="text-xs uppercase tracking-[0.24em] text-white/45">
              {status === "running" ? "Streaming" : "Idle"}
            </div>
          </div>
          <TranscriptStream agents={agents} messages={messages} draft={draft} />
        </div>

        <div className="grid gap-6">
          <RunStatusPanel
            status={status}
            turnCount={turnCount}
            maxTurns={run.maxTurns}
            currentSpeaker={currentSpeakerId ? agentMap.get(currentSpeakerId)?.name ?? currentSpeakerId : null}
            onStart={status === "pending" ? handleStart : undefined}
            onStop={status === "running" ? handleStop : undefined}
            isBusy={busy}
          />

          <div className="shell rounded-[28px] p-5">
            <div className="text-xs uppercase tracking-[0.32em] text-white/45">Shared briefing</div>
            <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-white/70">
              {run.briefing || "No shared briefing was supplied for this run."}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
