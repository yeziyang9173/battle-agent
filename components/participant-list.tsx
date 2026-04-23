"use client";

import type { AgentDefinition } from "@/lib/agents/registry";

type ParticipantListProps = {
  agents: AgentDefinition[];
  currentSpeakerId?: string | null;
};

export function ParticipantList({ agents, currentSpeakerId }: ParticipantListProps) {
  return (
    <div className="shell rounded-[28px] p-5">
      <div className="text-xs uppercase tracking-[0.32em] text-white/45">Participants</div>
      <div className="mt-4 grid gap-3">
        {agents.map((agent) => {
          const active = currentSpeakerId === agent.id;
          return (
            <div
              key={agent.id}
              className={`rounded-[22px] border px-4 py-3 transition ${
                active ? "border-white/30 bg-white/10" : "border-white/10 bg-white/[0.03]"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: `${agent.color}20`, color: agent.color }}
                >
                  {agent.emoji}
                </span>
                <div>
                  <div className="font-display text-lg">{agent.name}</div>
                  <div className="text-xs uppercase tracking-[0.22em] text-white/45">{agent.category}</div>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-white/65">{agent.vibe}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
