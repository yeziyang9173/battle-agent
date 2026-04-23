"use client";

import clsx from "clsx";
import type { AgentDefinition } from "@/lib/agents/registry";

type AgentPickerProps = {
  agents: AgentDefinition[];
  selectedAgentIds: string[];
  onToggle: (agentId: string) => void;
};

export function AgentPicker({ agents, selectedAgentIds, onToggle }: AgentPickerProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {agents.map((agent) => {
        const selected = selectedAgentIds.includes(agent.id);
        return (
          <button
            key={agent.id}
            type="button"
            onClick={() => onToggle(agent.id)}
            className={clsx(
              "shell rounded-[28px] p-4 text-left transition duration-200 hover:-translate-y-0.5",
              selected ? "border-white/30 bg-white/10" : "border-white/10",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.32em] text-white/45">{agent.category}</div>
                <div className="mt-2 flex items-center gap-2 font-display text-xl text-white">
                  <span>{agent.emoji}</span>
                  <span>{agent.name}</span>
                </div>
              </div>
              <span
                className="mt-1 h-3 w-3 rounded-full border border-white/30"
                style={{ backgroundColor: agent.color }}
              />
            </div>
            <p className="mt-3 text-sm leading-6 text-white/70">{agent.description}</p>
            <p className="mt-4 border-t border-white/10 pt-3 text-xs uppercase tracking-[0.24em] text-white/45">
              {agent.vibe}
            </p>
          </button>
        );
      })}
    </div>
  );
}
