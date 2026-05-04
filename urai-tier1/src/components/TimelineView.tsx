import { seedUserData } from "@/data/seedUser";

export default function TimelineView() {
  const { timelineEvents } = seedUserData;
  return (
    <main className="min-h-screen bg-[#070712] p-6 text-white">
      <section className="mx-auto max-w-4xl space-y-4">
        <h1 className="text-3xl font-bold">Life Map</h1>
        {timelineEvents.map((event) => (
          <div key={event.id} className="border border-white/10 rounded-xl p-4 bg-white/5">
            <div className="text-xs text-white/40">{event.occurredAt}</div>
            <div className="text-lg font-semibold">{event.title}</div>
            <div className="text-sm text-white/70">{event.body}</div>
          </div>
        ))}
      </section>
    </main>
  );
}
