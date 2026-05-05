import { seedUserData } from "@/data/seedUser";
import NarratorInsightCard from "./NarratorInsightCard";

export default function CognitiveMirror() {
  const data = seedUserData;
  return (
    <main className="min-h-screen bg-[#070712] p-6 text-white">
      <section className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="text-xs uppercase tracking-[0.3em] text-white/40">URAI Tier-1</div>
          <h1 className="mt-3 text-3xl font-bold">Cognitive Mirror</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/70">
            Seed-backed dashboard for visual verification before live ingestion is connected.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs uppercase text-white/40">Today</div>
            <div className="mt-2 text-xl font-semibold">{data.dailySummary.headline}</div>
            <p className="mt-2 text-sm text-white/70">{data.dailySummary.summary}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs uppercase text-white/40">Week</div>
            <div className="mt-2 text-xl font-semibold">{data.weeklySummary.headline}</div>
            <p className="mt-2 text-sm text-white/70">{data.weeklySummary.summary}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs uppercase text-white/40">Companion</div>
            <div className="mt-2 text-xl font-semibold">{data.companionState.phrase}</div>
            <p className="mt-2 text-sm text-white/70">Mood: {data.companionState.mood}</p>
          </div>
        </div>
        <section className="grid gap-4 md:grid-cols-2">
          {data.narratorInsights.map((insight) => (
            <NarratorInsightCard key={insight.id} insight={insight} />
          ))}
        </section>
      </section>
    </main>
  );
}
