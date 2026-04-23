"use client";

type TopicComposerProps = {
  topic: string;
  briefing: string;
  onTopicChange: (value: string) => void;
  onBriefingChange: (value: string) => void;
};

export function TopicComposer({
  topic,
  briefing,
  onTopicChange,
  onBriefingChange,
}: TopicComposerProps) {
  return (
    <div className="grid gap-4">
      <label className="grid gap-2">
        <span className="text-xs uppercase tracking-[0.32em] text-white/45">Topic</span>
        <textarea
          value={topic}
          onChange={(event) => onTopicChange(event.target.value)}
          rows={3}
          placeholder="Discuss recent developments in the agent ecosystem"
          className="shell min-h-[110px] rounded-[24px] px-5 py-4 text-base leading-7 text-white outline-none placeholder:text-white/25"
        />
      </label>
      <label className="grid gap-2">
        <span className="text-xs uppercase tracking-[0.32em] text-white/45">Shared briefing</span>
        <textarea
          value={briefing}
          onChange={(event) => onBriefingChange(event.target.value)}
          rows={8}
          placeholder="Paste a shared brief on OpenClaw, Hermes, or any other agent ecosystem signals."
          className="shell min-h-[220px] rounded-[24px] px-5 py-4 text-sm leading-7 text-white outline-none placeholder:text-white/25"
        />
      </label>
    </div>
  );
}
