import Link from 'next/link'
import currentReleaseReceipt from '@/data/currentReleaseReceipt.json'

export const metadata = {
  title: 'URAI Status',
  description: 'URAI Spatial implementation and production-certification matrix.',
}

const groups = [
  {
    title: 'Launch spine',
    items: [
      ['/', 'implemented', 'Home threshold entry'],
      ['/home', 'implemented', 'Canonical Home World'],
      ['/ground', 'implemented', 'Private operating world'],
      ['/life-map', 'implemented', 'Spatial memory galaxy'],
      ['/focus', 'implemented', 'Selected memory chamber'],
      ['/replay', 'implemented', 'Memory film route'],
      ['/mirror', 'implemented', 'Reflection realm'],
      ['/passport', 'implemented', 'Identity vault'],
      ['/status', 'implemented', 'Route and certification room'],
    ],
  },
  {
    title: 'Trust and place',
    items: [
      ['/privacy-controls', 'implemented', 'Permission controls'],
      ['/location-map', 'implemented', 'Place and emotional weather'],
      ['/ascent', 'implemented', 'Sky ascent route'],
      ['/unwind', 'implemented', 'Return route'],
    ],
  },
  {
    title: 'Showcase and XR',
    items: [
      ['/demo', 'implemented', 'Public walkthrough'],
      ['/demo/replay-film', 'implemented', 'Replay film proof surface'],
      ['/spatial/life-map', 'implemented', 'Spatial Life Map'],
      ['/spatial/life-map-r3f', 'implemented', 'R3F Life Map'],
      ['/spatial/ar-vr', 'preview', 'Explorable XR entry; physical verification remains separate'],
    ],
  },
] as const

const totalRoutes = groups.reduce((sum, group) => sum + group.items.length, 0)

const badgeClass = (state: 'implemented' | 'preview') =>
  state === 'implemented'
    ? 'border-cyan-100/20 bg-cyan-100 text-slate-950'
    : 'border-amber-200/30 bg-amber-200 text-slate-950'

const shortSha = (value: string | null | undefined) => value ? value.slice(0, 12) : 'Not recorded'

const receiptRows = [
  ['Release state', currentReleaseReceipt.releaseState ?? 'Not recorded'],
  ['Audited main', shortSha(currentReleaseReceipt.sourceMainShaAtAudit)],
  ['Tested SHA', shortSha(currentReleaseReceipt.testedSha)],
  ['Deployed SHA', shortSha(currentReleaseReceipt.deployedSha)],
  ['Rollback SHA', shortSha(currentReleaseReceipt.rollbackSha)],
  ['Firebase project', currentReleaseReceipt.firebaseProject ?? 'Not recorded'],
  ['Asset pack', currentReleaseReceipt.assetPackVersion ?? 'Not recorded'],
  ['Quest proof', currentReleaseReceipt.evidence?.questDeviceProof ?? 'Not recorded'],
] as const

export default function StatusRoutePage() {
  return (
    <main
      className="relative min-h-screen overflow-hidden bg-[#020713] px-4 py-8 text-white md:px-8"
      data-testid="urai-final-status-control-room"
      data-launch-surface="premium-status-control-room"
      data-production-certification={currentReleaseReceipt.releaseState ?? 'pending-current-main-evidence'}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_20%,rgba(103,232,249,0.20),transparent_30%),radial-gradient(circle_at_76%_28%,rgba(192,132,252,0.18),transparent_32%),linear-gradient(180deg,#020713_0%,#04111b_58%,#01040a_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,transparent_0_38%,rgba(0,0,0,0.64)_78%,rgba(0,0,0,0.92)_100%)]" />
      <section className="relative z-10 mx-auto max-w-[1480px]">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_410px]">
          <article className="rounded-[2rem] border border-cyan-100/15 bg-slate-950/60 p-8 shadow-2xl shadow-black/40 backdrop-blur-2xl md:p-12">
            <p className="text-xs font-black uppercase tracking-[0.42em] text-cyan-200">URAI Status · Evidence Control Room</p>
            <h1 className="mt-4 max-w-4xl text-6xl font-black leading-[0.82] tracking-[-0.1em] md:text-8xl">
              Routes implemented. Production certification pending.
            </h1>
            <p className="mt-6 max-w-3xl text-base font-semibold leading-8 text-slate-200/80">
              This room reads one machine-readable receipt. Blank SHA fields mean the evidence has not been established; route reachability never fills them automatically.
            </p>
          </article>
          <article className="rounded-[2rem] border border-cyan-100/15 bg-slate-950/60 p-7 shadow-2xl shadow-cyan-950/30 backdrop-blur-2xl">
            <div className="mx-auto mb-8 h-44 w-44 rounded-full bg-[radial-gradient(circle_at_38%_28%,white_0_8%,rgba(255,255,255,0.45)_9%_18%,transparent_19%),radial-gradient(circle,#9af8ff_0_24%,#45bfff_44%,rgba(2,12,24,0.95)_100%)] shadow-[0_0_80px_rgba(122,246,255,0.68),0_0_160px_rgba(122,246,255,0.22)]" />
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"><span className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">Tracked</span><strong className="mt-2 block text-2xl">{totalRoutes}</strong></div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"><span className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">Source</span><strong className="mt-2 block text-2xl">Implemented</strong></div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"><span className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">XR</span><strong className="mt-2 block text-2xl">Preview</strong></div>
              <div className="rounded-2xl border border-amber-200/20 bg-amber-200/[0.08] p-4"><span className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-200">Production</span><strong className="mt-2 block text-2xl">Pending proof</strong></div>
            </div>
          </article>
        </div>

        <section className="mt-6 rounded-[2rem] border border-amber-200/20 bg-slate-950/58 p-6 shadow-2xl shadow-black/30 backdrop-blur-2xl">
          <h2 className="text-xl font-black text-amber-100">Current release receipt</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {receiptRows.map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">{label}</span>
                <strong className="mt-2 block break-words text-sm">{value}</strong>
              </div>
            ))}
          </div>
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
        <section className="mt-6 rounded-[2rem] border border-amber-200/20 bg-amber-200/[0.07] p-6 text-sm font-semibold leading-7 text-amber-50/90">
          <h2 className="text-xl font-black text-amber-100">Certification boundary</h2>
          <p className="mt-2">Production certification remains pending until the tested and deployed SHAs match, a rollback SHA is recorded, and every required evidence field in the receipt passes.</p>
        </section>
        <nav className="mt-6 flex flex-wrap gap-3" aria-label="Status route navigation">
          <Link className="rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950 no-underline" href="/home">Open Home</Link>
          <Link className="rounded-full border border-white/20 px-5 py-3 text-sm font-black text-white no-underline" href="/ground">Open Ground</Link>
          <Link className="rounded-full border border-white/20 px-5 py-3 text-sm font-black text-white no-underline" href="/life-map">Open Life Map</Link>
          <Link className="rounded-full border border-white/20 px-5 py-3 text-sm font-black text-white no-underline" href="/spatial/ar-vr">Open XR preview</Link>
        </nav>
      </section>
    </main>
  )
}
