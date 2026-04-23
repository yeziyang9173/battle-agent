"use client";

import Link from "next/link";

type HistoryRun = {
  id: string;
  title: string;
  topic: string;
  status: string;
  turnCount: number;
  createdAt: string;
};

type HistoryListProps = {
  runs: HistoryRun[];
};

export function HistoryList({ runs }: HistoryListProps) {
  return (
    <div className="grid gap-4">
      {runs.map((run) => (
        <Link key={run.id} href={`/runs/${run.id}`} className="shell rounded-[28px] p-5 transition hover:-translate-y-0.5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-display text-2xl">{run.title}</div>
              <div className="mt-2 max-w-3xl text-sm leading-6 text-white/65">{run.topic}</div>
            </div>
            <div className="text-right text-xs uppercase tracking-[0.24em] text-white/45">
              <div>{run.status}</div>
              <div className="mt-2">{run.turnCount} turns</div>
            </div>
          </div>
          <div className="mt-5 border-t border-white/10 pt-3 text-xs uppercase tracking-[0.22em] text-white/40">
            {new Date(run.createdAt).toLocaleString()}
          </div>
        </Link>
      ))}
    </div>
  );
}
