"use client";

type RunConfigPanelProps = {
  maxTurns: number;
  replyStyle: "tight" | "balanced";
  onMaxTurnsChange: (value: number) => void;
  onReplyStyleChange: (value: "tight" | "balanced") => void;
};

export function RunConfigPanel({
  maxTurns,
  replyStyle,
  onMaxTurnsChange,
  onReplyStyleChange,
}: RunConfigPanelProps) {
  return (
    <div className="shell rounded-[28px] p-5">
      <div className="text-xs uppercase tracking-[0.32em] text-white/45">Run controls</div>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm text-white/65">Max turns</span>
          <input
            type="range"
            min={4}
            max={16}
            step={1}
            value={maxTurns}
            onChange={(event) => onMaxTurnsChange(Number(event.target.value))}
          />
          <span className="font-display text-2xl">{maxTurns}</span>
        </label>

        <div className="grid gap-2">
          <span className="text-sm text-white/65">Reply length</span>
          <div className="grid grid-cols-2 gap-2">
            {(["tight", "balanced"] as const).map((option) => {
              const active = replyStyle === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => onReplyStyleChange(option)}
                  className={`rounded-2xl border px-4 py-3 text-sm capitalize transition ${
                    active
                      ? "border-white/30 bg-white/10 text-white"
                      : "border-white/10 bg-white/[0.03] text-white/60"
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
