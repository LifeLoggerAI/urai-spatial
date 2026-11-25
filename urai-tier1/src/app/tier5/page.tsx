import InstitutionalPublicSurface from '../InstitutionalPublicSurface'
import { getTier5SystemContract } from "@/lib/tier5-production-contract";

export const metadata = {
  title: "URAI Spatial Tier 5",
  description:
    "Production-gated Tier 5 release surface with explicit fallback, verification, and deployment boundaries.",
};

export default function Tier5Page() {
  const contract = getTier5SystemContract();

  return (
    <InstitutionalPublicSurface
      eyebrow="UrAi · Availability"
      title="Release readiness"
      lede="A release is ready only when its required checks are complete. Review the current boundaries and the evidence still needed."
      links={[{ href: '/status', label: 'Current release status', primary: true }, { href: '/home', label: 'Return Home' }]}
    >
      <p>These details are read-only. They do not enable features or certify a live deployment.</p>
      <details>
        <summary style={{ minHeight: 48, cursor: 'pointer', color: '#b9f4ff' }}>Tier 5 final release gate · Review technical readiness</summary>
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
            <p className="text-sm text-white/55">Release status</p>
            <strong className="mt-2 block text-xl">{contract.status}</strong>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
            <p className="text-sm text-white/55">Deployment claimed</p>
            <strong className="mt-2 block text-xl">{contract.deploymentClaimed ? "yes" : "no"}</strong>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
            <p className="text-sm text-white/55">Browser E2E claimed</p>
            <strong className="mt-2 block text-xl">{contract.browserE2EClaimed ? "yes" : "no"}</strong>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
            <p className="text-sm text-white/55">Protected tiers</p>
            <strong className="mt-2 block text-xl">{contract.lowerTierProtection.join(", ")}</strong>
          </div>
        </div>

        <section className="mt-10 grid gap-5">
          {contract.capabilities.map((capability) => (
            <article
              key={capability.id}
              className="rounded-3xl border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-fuchsia-950/20"
              data-tier5-capability={capability.id}
              data-tier5-status={capability.status}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-fuchsia-200/70">
                    {capability.status}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold">{capability.label}</h2>
                </div>
                <code className="rounded-full border border-white/10 px-3 py-1 text-sm text-white/70">
                  {capability.route}
                </code>
              </div>

              <dl className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <dt className="text-sm text-white/45">Source</dt>
                  <dd className="mt-1 text-white/78">{capability.source}</dd>
                </div>
                <div>
                  <dt className="text-sm text-white/45">Dependency</dt>
                  <dd className="mt-1 text-white/78">{capability.dependency}</dd>
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

        <section className="mt-10 rounded-3xl border border-fuchsia-200/20 bg-fuchsia-200/[0.06] p-6">
          <h2 className="text-2xl font-semibold">Tier 5 release rules</h2>
          <ul className="mt-4 space-y-3 text-white/76">
            {contract.releaseRules.map((rule) => (
              <li key={rule}>• {rule}</li>
            ))}
          </ul>
        </section>
      </details>
    </InstitutionalPublicSurface>
  );
}
