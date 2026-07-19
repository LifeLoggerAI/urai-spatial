import Link from 'next/link'
import StatusReleaseAuthority from './StatusReleaseAuthority'
import { launchTruth } from '@/data/launchTruth'
import { assetCssStack, statusAssets } from '@/spatial/assets/uraiAssets'

export const metadata = {
  title: 'URAI Status',
  description: 'URAI Spatial verified-live authority and bounded certification matrix.',
}

const groups = [
  {
    title: 'Launch spine',
    items: [
      ['/', 'verified live', 'Home threshold entry'],
      ['/home', 'verified live', 'Canonical Home World'],
      ['/ground', 'verified live', 'Private operating world'],
      ['/life-map', 'verified live', 'Spatial memory galaxy'],
      ['/focus', 'verified live', 'Selected memory chamber'],
      ['/replay', 'verified live', 'Memory film route'],
      ['/mirror', 'verified live', 'Reflection realm'],
      ['/passport', 'verified live', 'Identity vault'],
      ['/status', 'verified live', 'Route and certification room'],
    ],
  },
  {
    title: 'Trust and place',
    items: [
      ['/privacy-controls', 'verified live', 'Permission controls'],
      ['/location-map', 'verified live', 'Place and emotional weather'],
      ['/ascent', 'verified live', 'Sky ascent route'],
      ['/unwind', 'verified live', 'Return route'],
    ],
  },
  {
    title: 'Showcase and XR',
    items: [
      ['/demo', 'verified live', 'Disclosed public walkthrough'],
      ['/demo/replay-film', 'verified live', 'Disclosed Replay film proof surface'],
      ['/spatial/life-map', 'verified live', 'Spatial Life Map'],
      ['/spatial/life-map-r3f', 'verified live', 'R3F Life Map'],
      ['/spatial/ar-vr', 'preview', 'Live browser preview; physical verification remains separate'],
    ],
  },
] as const

const totalRoutes = groups.reduce((sum, group) => sum + group.items.length, 0)

const badgeClass = (state: string) => {
  if (state === 'verified live') return 'border-emerald-200/30 bg-emerald-200 text-slate-950'
  if (state === 'implemented') return 'border-cyan-100/20 bg-cyan-100 text-slate-950'
  if (state === 'pending proof') return 'border-violet-200/30 bg-violet-200 text-slate-950'
  return 'border-amber-200/30 bg-amber-200 text-slate-950'
}

export default function StatusRoutePage() {
  return (
    <main
      className="relative min-h-screen overflow-hidden bg-[#020713] px-4 py-8 text-white md:px-8"
      data-testid="urai-final-status-control-room"
      data-launch-surface="premium-status-control-room"
      data-production-certification="verified-live-fingerprint"
      data-launch-truth-source="urai-tier1/src/data/launchTruth.ts"
      data-canonical-asset={statusAssets.primary.src}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.16] mix-blend-screen"
        style={{ backgroundImage: assetCssStack(statusAssets.primary), backgroundSize: 'cover', backgroundPosition: 'center' }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_20%,rgba(103,232,249,0.20),transparent_30%),radial-gradient(circle_at_76%_28%,rgba(192,132,252,0.18),transparent_32%),linear-gradient(180deg,#020713_0%,#04111b_58%,#01040a_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,transparent_0_38%,rgba(0,0,0,0.64)_78%,rgba(0,0,0,0.92)_100%)]" />
      <section className="relative z-10 mx-auto max-w-[1480px]">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_410px]">
          <article className="rounded-[2rem] border border-cyan-100/15 bg-slate-950/60 p-8 shadow-2xl shadow-black/40 backdrop-blur-2xl md:p-12">
            <p className="text-xs font-black uppercase tracking-[0.42em] text-cyan-200">URAI Status · Launch Truth Control Room</p>
            <h1 className="mt-4 max-w-4xl text-6xl font-black leading-[0.82] tracking-[-0.1em] md:text-8xl">
              Spatial live. Proof remains visible.
            </h1>
            <p className="mt-6 max-w-3xl text-base font-semibold leading-8 text-slate-200/80">
              The canonical web release is verified through a protected public fingerprint, exact-head deployment receipt, route and slash parity, desktop and mobile identity checks, and an executable rollback target. Physical XR, providers, and the supporting estate remain separately gated.
            </p>
          </article>
          <StatusReleaseAuthority totalRoutes={totalRoutes} />
        </div>
        <section className="mt-6 rounded-[2rem] border border-cyan-100/15 bg-cyan-100/[0.06] p-6 text-sm font-semibold leading-7 text-cyan-50/90">
          <h2 className="text-xl font-black text-cyan-100">Launch truth</h2>
          <p className="mt-2">Safe claim: {launchTruth.safeClaim}</p>
          <p className="mt-3">Blocked claim: {launchTruth.unsafeClaim}</p>
        </section>
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          {groups.map((group) => (
            <section key={group.title} className="rounded-[2rem] border border-white/10 bg-slate-950/58 p-5 shadow-2xl shadow-black/30 backdrop-blur-2xl">
              <h2 className="text-xl font-black tracking-tight">{group.title}</h2>
              <div className="mt-5 grid gap-3">
                {group.items.map(([route, state, note]) => (
                  <article key={route} className="rounded-2xl border border-cyan-100/10 bg-white/[0.045] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <code className="font-mono text-sm font-black text-cyan-100">{route}</code>
                      <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${badgeClass(state)}`}>{state}</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-200/76">{note}</p>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
        <section className="mt-6 rounded-[2rem] border border-emerald-200/20 bg-emerald-200/[0.07] p-6 text-sm font-semibold leading-7 text-emerald-50/90">
          <h2 className="text-xl font-black text-emerald-100">Certification boundary</h2>
          <p className="mt-2">The canonical Spatial web release is verified live. This does not certify physical Quest hardware, provider-backed assets, private supporting services, autonomous real-world actions, or the wider repository estate; those claims require their own protected receipts.</p>
        </section>
        <nav className="mt-6 flex flex-wrap gap-3" aria-label="Status route navigation">
          <Link className="rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950 no-underline" href="/home">Open Home</Link>
          <Link className="rounded-full border border-white/20 px-5 py-3 text-sm font-black text-white no-underline" href="/ground">Open Ground</Link>
          <Link className="rounded-full border border-white/20 px-5 py-3 text-sm font-black text-white no-underline" href="/life-map">Open Life Map</Link>
          <Link className="rounded-full border border-white/20 px-5 py-3 text-sm font-black text-white no-underline" href="/privacy-controls">Privacy Controls</Link>
          <Link className="rounded-full border border-white/20 px-5 py-3 text-sm font-black text-white no-underline" href="/spatial/ar-vr">Open XR preview</Link>
        </nav>
      </section>
    </main>
  )
}
