"use client";

import clsx from "clsx";

type TranscriptMessageProps = {
  name: string;
  color: string;
  emoji?: string;
  content: string;
  createdAt?: string;
  isStreaming?: boolean;
};

export function TranscriptMessage({
  name,
  color,
  emoji,
  content,
  createdAt,
  isStreaming,
}: TranscriptMessageProps) {
  return (
    <article className="shell rounded-[28px] p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 text-lg"
            style={{ backgroundColor: `${color}20`, color }}
          >
            {emoji ?? "✦"}
          </div>
          <div>
            <div className="font-display text-xl">{name}</div>
            {createdAt ? (
              <div className="text-xs uppercase tracking-[0.22em] text-white/40">
                {new Date(createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-white/45">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
          {isStreaming ? <span>live</span> : <span>settled</span>}
        </div>
      </div>
      <div className={clsx("mt-4 whitespace-pre-wrap text-sm leading-7 text-white/80", isStreaming && "animate-pulse")}>{content || "…"}</div>
    </article>
  );
}
