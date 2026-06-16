import { getTier4SystemContract } from "@/lib/tier4-production-contract";

export const metadata = {
  title: "URAI Spatial Tier 4",
  description: "Production-gated Tier 4 readiness surface with explicit provider and deployment boundaries.",
};

export default function Tier4Page() {
  const contract = getTier4SystemContract();

  return (
    <main className="min-h-screen bg-[#05030b] px-6 py-10 text-white">
      <section className="mx-auto max-w-6xl">
        <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/80">URAI Spatial</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">
          Tier 4 production gate
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-white/72">
          Tier 4 is wired as a safe readiness layer: contracts, entitlement boundaries,
          integration seams, fallback states, and release evidence stay visible without
          claiming unavailable providers or live deployment.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
            <p className="text-sm text-white/55">Release status</p>
            <strong className="mt-2 block text-2xl">{contract.status}</strong>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
            <p className="text-sm text-white/55">Live deployment claimed</p>
            <strong className="mt-2 block text-2xl">{contract.liveDeploymentClaimed ? "yes" : "no"}</strong>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
            <p className="text-sm text-white/55">Browser proof claimed</p>
            <strong className="mt-2 block text-2xl">{contract.browserProofClaimed ? "yes" : "no"}</strong>
          </div>
        </div>

        <section className="mt-10 grid gap-5">
          {contract.capabilities.map((capability) => (
            <article
              key={capability.id}
              className="rounded-3xl border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-cyan-950/20"
              data-tier4-capability={capability.id}
              data-tier4-status={capability.status}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-cyan-200/70">{capability.status}</p>
                  <h2 className="mt-2 text-2xl font-semibold">{capability.label}</h2>
                </div>
                <code className="rounded-full border border-white/10 px-3 py-1 text-sm text-white/70">
                  {capability.route}
                </code>
              </div>

              <dl className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <dt className="text-sm text-white/45">Data source</dt>
                  <dd className="mt-1 text-white/78">{capability.dataSource}</dd>
                </div>
                <div>
                  <dt className="text-sm text-white/45">External dependency</dt>
                  <dd className="mt-1 text-white/78">{capability.externalDependency}</dd>
                </div>
                <div>
                  <dt className="text-sm text-white/45">Privacy boundary</dt>
                  <dd className="mt-1 text-white/78">{capability.privacyBoundary}</dd>
                </div>
                <div>
                  <dt className="text-sm text-white/45">Fallback</dt>
                  <dd className="mt-1 text-white/78">{capability.fallback}</dd>
                </div>
              </dl>
            </article>
          ))}
        </section>

        <section className="mt-10 rounded-3xl border border-amber-200/20 bg-amber-200/[0.06] p-6">
          <h2 className="text-2xl font-semibold">Release rules</h2>
          <ul className="mt-4 space-y-3 text-white/76">
            {contract.releaseRules.map((rule) => (
              <li key={rule}>• {rule}</li>
            ))}
          </ul>
        </section>
      </section>
    </main>
  );
}
