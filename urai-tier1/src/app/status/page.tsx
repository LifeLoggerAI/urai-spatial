import Link from 'next/link'

export const metadata = {
  title: 'URAI Status',
  description: 'URAI Spatial launch status and route matrix for the connected public route chain.',
}

const routeGroups = [
  {
    label: 'Public launch routes',
    routes: [
      ['/', 'verified', 'Home threshold entry.'],
      ['/home', 'verified', 'Canonical Home World mirror of root.'],
      ['/ground', 'verified', 'Private real-life operating layer.'],
      ['/life-map', 'verified-source', 'Single cinematic Life Map source path; live deploy must refresh to remove old stacked fallback output.'],
      ['/focus', 'verified', 'Selected memory chamber.'],
      ['/replay', 'verified', 'Living memory replay surface.'],
      ['/mirror', 'upgraded', 'Mirror World reflection route expanded in this pass.'],
      ['/passport', 'verified', 'Identity and permissions layer.'],
      ['/status', 'upgraded', 'This route truth matrix.'],
      ['/location-map', 'verified', 'Symbolic place atlas.'],
      ['/privacy-controls', 'fixed-route', 'Dedicated route added so it no longer falls through to Home/Mirror.'],
    ],
  },
  {
    label: 'Intentional demo or realm routes',
    routes: [
      ['/demo', 'demo', 'Demo shell.'],
      ['/demo/life-map', 'demo', 'Life Map demo entry.'],
      ['/dream', 'realm-shell', 'Symbolic realm surface, not launch spine.'],
      ['/legacy', 'realm-shell', 'Archive realm surface, not launch spine.'],
      ['/council', 'realm-shell', 'Reflection council surface, not launch spine.'],
      ['/launch', 'marketing-demo', 'Launch/media page; public-safe but not primary app path.'],
    ],
  },
  {
    label: 'Release gates and experiments',
    routes: [
      ['/tier4', 'gate', 'Production gate and contract boundary surface.'],
      ['/tier5', 'gate', 'Final release gate and verification boundary surface.'],
      ['/spatial/shadow', 'experimental', 'Shadow route; keep out of primary launch navigation.'],
      ['/spatial/legacy', 'experimental', 'Legacy spatial route; keep out of primary launch navigation.'],
      ['/spatial/ar-vr', 'experimental', 'XR/AR/VR placeholder route; not primary launch spine.'],
    ],
  },
  {
    label: 'API and system routes',
    routes: [
      ['/api/system/health', 'system', 'Machine health response.'],
      ['/api/system/capabilities', 'system', 'Capabilities contract.'],
      ['/api/system/integration-contract', 'system', 'Integration contract.'],
      ['/api/system/launch-boundary', 'system', 'Launch boundary contract.'],
      ['/api/body-biometric', 'api', 'Data/API endpoint, not a visual route.'],
      ['/api/orb-companion', 'api', 'Orb companion endpoint.'],
    ],
  },
  {
    label: 'Dynamic generated routes',
    routes: [
      ['/focus/session/[sessionId]', 'dynamic', 'Session-focused route; needs export/static-param checks in build.'],
      ['/life-map/star/[starId]', 'dynamic', 'Star deep-link route.'],
      ['/place/[placeId]', 'dynamic', 'Place route.'],
      ['/place/[placeId]/replay', 'dynamic', 'Place replay route.'],
      ['/replay/[replayId]', 'dynamic', 'Replay deep-link route.'],
      ['/u/[handle]', 'dynamic', 'Public/profile handle surface.'],
    ],
  },
] as const

const totals = routeGroups.reduce(
  (acc, group) => acc + group.routes.length,
  0,
)

export default function StatusRoutePage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-7xl">
        <p className="text-xs uppercase tracking-[0.45em] text-cyan-100/70">URAI Status · Route Truth</p>
        <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-tight md:text-6xl">World online. Route matrix visible.</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-200 md:text-base">
          This page replaces the old simplified route count with a launch QA surface. It separates public launch paths, demo paths, release gates, system APIs, and dynamic routes without exposing secrets.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <article className="rounded-3xl border border-white/10 bg-white/[0.07] p-5">
            <span className="text-xs uppercase tracking-[0.28em] text-slate-400">Tracked routes</span>
            <strong className="mt-2 block text-3xl">{totals}</strong>
          </article>
          <article className="rounded-3xl border border-white/10 bg-white/[0.07] p-5">
            <span className="text-xs uppercase tracking-[0.28em] text-slate-400">Launch spine</span>
            <strong className="mt-2 block text-3xl">11</strong>
          </article>
          <article className="rounded-3xl border border-white/10 bg-white/[0.07] p-5">
            <span className="text-xs uppercase tracking-[0.28em] text-slate-400">Primary state</span>
            <strong className="mt-2 block text-3xl">cleaning</strong>
          </article>
          <article className="rounded-3xl border border-white/10 bg-white/[0.07] p-5">
            <span className="text-xs uppercase tracking-[0.28em] text-slate-400">Secrets</span>
            <strong className="mt-2 block text-3xl">hidden</strong>
          </article>
        </div>

        <div className="mt-10 grid gap-6">
          {routeGroups.map((group) => (
            <section key={group.label} className="rounded-3xl border border-white/10 bg-white/[0.05] p-5 shadow-2xl shadow-cyan-950/20">
              <h2 className="text-2xl font-semibold">{group.label}</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[720px] border-separate border-spacing-y-2 text-left text-sm">
                  <thead className="text-xs uppercase tracking-[0.25em] text-slate-400">
                    <tr>
                      <th className="px-3 py-2">Route</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.routes.map(([route, status, notes]) => (
                      <tr key={route} className="bg-slate-900/80">
                        <td className="rounded-l-2xl px-3 py-3 font-mono text-cyan-100">{route}</td>
                        <td className="px-3 py-3"><span className="rounded-full border border-white/15 px-3 py-1 text-xs">{status}</span></td>
                        <td className="rounded-r-2xl px-3 py-3 text-slate-300">{notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950" href="/home">Open Home</Link>
          <Link className="rounded-full border border-white/20 px-4 py-2 text-sm text-white" href="/life-map">Open Life Map</Link>
          <Link className="rounded-full border border-white/20 px-4 py-2 text-sm text-white" href="/mirror">Open Mirror</Link>
          <Link className="rounded-full border border-white/20 px-4 py-2 text-sm text-white" href="/passport">Open Passport</Link>
        </div>
      </section>
    </main>
  )
}
