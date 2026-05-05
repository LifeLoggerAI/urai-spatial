import { seedUserData } from "@/data/seedUser";

export default function ConsentSettings() {
  return (
    <main className="min-h-screen bg-[#070712] p-6 text-white">
      <section className="mx-auto max-w-4xl space-y-4">
        <h1 className="text-3xl font-bold">Consent Settings</h1>
        <p className="text-sm text-white/60">Seed-backed consent status for Tier-1 trust-layer verification.</p>
        {seedUserData.consent.map((record) => (
          <div key={record.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-lg font-semibold">{record.scope}</div>
            <div className="mt-1 text-sm text-white/70">Status: {record.status}</div>
            {record.notes && <div className="mt-2 text-xs text-white/45">{record.notes}</div>}
          </div>
        ))}
      </section>
    </main>
  );
}
