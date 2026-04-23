import { prisma } from "@/lib/db/prisma";
import { HistoryList } from "@/components/history-list";

export default async function HistoryPage() {
  const runs = await prisma.conversationRun.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1200px] flex-col gap-8 px-6 py-10 lg:px-10">
      <header className="flex items-end justify-between gap-4">
        <div>
          <div className="mb-4 flex items-center gap-3 text-xs uppercase tracking-[0.34em] text-signal">
            <span className="signal-dot" />
            History
          </div>
          <h1 className="font-display text-5xl">Previous runs</h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-white/68">
            Reopen any transcript, inspect the topic and status, and reuse old conversation rooms for new demos.
          </p>
        </div>
        <a href="/" className="text-sm uppercase tracking-[0.24em] text-white/55 hover:text-white">
          New run
        </a>
      </header>

      <HistoryList
        runs={runs.map((run) => ({
          id: run.id,
          title: run.title,
          topic: run.topic,
          status: run.status,
          turnCount: run.turnCount,
          createdAt: run.createdAt.toISOString(),
        }))}
      />
    </main>
  );
}
