import { seedUserData } from "@/data/seedUser";

export default function DataControls() {
  return (
    <main className="min-h-screen bg-[#070712] p-6 text-white">
      <section className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-3xl font-bold">Data Controls</h1>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="font-semibold mb-2">Export Requests</div>
          {seedUserData.exportRequests.map((req) => (
            <div key={req.id} className="text-sm text-white/70">
              {req.format} → {req.status}
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="font-semibold mb-2">Delete Requests</div>
          {seedUserData.deleteRequests.map((req) => (
            <div key={req.id} className="text-sm text-white/70">
              {req.scope} → {req.status}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
