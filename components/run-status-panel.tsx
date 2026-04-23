"use client";

type RunStatusPanelProps = {
  status: string;
  turnCount: number;
  maxTurns: number;
  currentSpeaker?: string | null;
  onStart?: () => void;
  onStop?: () => void;
  isBusy?: boolean;
};

export function RunStatusPanel({
  status,
  turnCount,
  maxTurns,
  currentSpeaker,
  onStart,
  onStop,
  isBusy,
}: RunStatusPanelProps) {
  return (
    <div className="shell rounded-[28px] p-5">
      <div className="text-xs uppercase tracking-[0.32em] text-white/45">Run state</div>
      <div className="mt-4 grid gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-white/45">Status</div>
          <div className="mt-1 font-display text-3xl capitalize">{status}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-white/45">Turns</div>
          <div className="mt-1 text-lg text-white/80">
            {turnCount} / {maxTurns}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-white/45">Current speaker</div>
          <div className="mt-1 text-lg text-white/80">{currentSpeaker ?? "Waiting"}</div>
        </div>
      </div>

      <div className="mt-6 grid gap-3">
        {onStart ? (
          <button
            type="button"
            onClick={onStart}
            disabled={isBusy}
            className="rounded-full border border-signal/40 bg-signal/10 px-4 py-3 text-sm uppercase tracking-[0.24em] text-signal disabled:opacity-50"
          >
            Start
          </button>
        ) : null}
        {onStop ? (
          <button
            type="button"
            onClick={onStop}
            disabled={isBusy}
            className="rounded-full border border-ember/40 bg-ember/10 px-4 py-3 text-sm uppercase tracking-[0.24em] text-ember disabled:opacity-50"
          >
            Stop
          </button>
        ) : null}
      </div>
    </div>
  );
}
