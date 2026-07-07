export const metadata = {
  title: "URAI Launch Dashboard",
  description: "URAI readiness and verification dashboard.",
};

const areas = [
  ["Engineering", "GREEN", "Build, verification, and runtime systems"],
  ["Experience", "YELLOW", "Premium assets and cinematic polish"],
  ["Documentation", "GREEN", "Launch systems and evidence"],
  ["Deployment", "YELLOW", "Final hosted certification"],
];

export default function LaunchDashboardPage() {
  return (
    <main className="min-h-screen bg-[#020713] px-6 py-12 text-white">
      <section className="mx-auto max-w-5xl">
        <p className="text-xs font-black uppercase tracking-[0.4em] text-cyan-200">
          URAI Launch Dashboard
        </p>
        <h1 className="mt-4 text-5xl font-black">Launch readiness control room</h1>
        <p className="mt-5 max-w-3xl text-slate-300">
          A single surface for readiness state, verification areas, dependencies,
          and remaining polish work.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {areas.map(([name, state, detail]) => (
            <article key={name} className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex justify-between">
                <h2 className="font-black">{name}</h2>
                <span className="font-black text-cyan-200">{state}</span>
              </div>
              <p className="mt-3 text-slate-300">{detail}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
