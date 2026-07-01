import Link from 'next/link'

export const metadata = {
  title: 'URAI Status',
  description: 'URAI Spatial live route room and launch readiness matrix.',
}

const groups = [
  {
    title: 'Launch spine',
    items: [
      ['/', 'live', 'Home threshold entry'],
      ['/home', 'live', 'Canonical Home World'],
      ['/ground', 'live', 'Private operating world'],
      ['/life-map', 'live', 'Spatial memory galaxy'],
      ['/focus', 'live', 'Selected memory chamber'],
      ['/replay', 'live', 'Memory film route'],
      ['/mirror', 'live', 'Reflection realm'],
      ['/passport', 'live', 'Identity vault'],
      ['/status', 'live', 'Route room'],
    ],
  },
  {
    title: 'Trust and place',
    items: [
      ['/privacy-controls', 'live', 'Permission controls'],
      ['/location-map', 'live', 'Place and emotional weather'],
      ['/ascent', 'live', 'Sky ascent route'],
      ['/unwind', 'live', 'Return route'],
    ],
  },
  {
    title: 'Showcase and XR',
    items: [
      ['/demo', 'live', 'Public walkthrough'],
      ['/demo/replay-film', 'live', 'Replay film proof'],
      ['/spatial/life-map', 'live', 'Spatial Life Map'],
      ['/spatial/life-map-r3f', 'live', 'R3F Life Map'],
      ['/spatial/ar-vr', 'preview', 'Quest and XR entry'],
    ],
  },
] as const

const totalRoutes = groups.reduce((sum, group) => sum + group.items.length, 0)

export default function StatusRoutePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020713] px-4 py-8 text-white md:px-8" data-testid="urai-final-status-control-room" data-launch-surface="premium-status-control-room">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_20%,rgba(103,232,249,0.20),transparent_30%),radial-gradient(circle_at_76%_28%,rgba(192,132,252,0.18),transparent_32%),linear-gradient(180deg,#020713_0%,#04111b_58%,#01040a_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,transparent_0_38%,rgba(0,0,0,0.64)_78%,rgba(0,0,0,0.92)_100%)]" />
      <section className="relative z-10 mx-auto max-w-[1480px]">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_410px]">
          <article className="rounded-[2rem] border border-cyan-100/15 bg-slate-950/60 p-8 shadow-2xl shadow-black/40 backdrop-blur-2xl md:p-12">
            <p className="text-xs font-black uppercase tracking-[0.42em] text-cyan-200">URAI Status · Live Control Room</p>
            <h1 className="mt-4 max-w-4xl text-6xl font-black leading-[0.82] tracking-[-0.1em] md:text-8xl">World online. Route matrix visible.</h1>
            <p className="mt-6 max-w-3xl text-base font-semibold leading-8 text-slate-200/80">
              This room keeps the public launch chain, spatial routes, XR entry, and trust surfaces readable in one premium place.
            </p>
          </article>
          <article className="rounded-[2rem] border border-cyan-100/15 bg-slate-950/60 p-7 shadow-2xl shadow-cyan-950/30 backdrop-blur-2xl">
            <div className="mx-auto mb-8 h-44 w-44 rounded-full bg-[radial-gradient(circle_at_38%_28%,white_0_8%,rgba(255,255,255,0.45)_9%_18%,transparent_19%),radial-gradient(circle,#9af8ff_0_24%,#45bfff_44%,rgba(2,12,24,0.95)_100%)] shadow-[0_0_80px_rgba(122,246,255,0.68),0_0_160px_rgba(122,246,255,0.22)]" />
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"><span className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">Tracked</span><strong className="mt-2 block text-2xl">{totalRoutes}</strong></div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"><span className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">Primary</span><strong className="mt-2 block text-2xl">Live</strong></div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"><span className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">XR</span><strong className="mt-2 block text-2xl">Preview</strong></div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"><span className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">Mode</span><strong className="mt-2 block text-2xl">Launch</strong></div>
            </div>
          </article>
        </div>
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          {groups.map((group) => (
            <section key={group.title} className="rounded-[2rem] border border-white/10 bg-slate-950/58 p-5 shadow-2xl shadow-black/30 backdrop-blur-2xl">
              <h2 className="text-xl font-black tracking-tight">{group.title}</h2>
              <div className="mt-5 grid gap-3">
                {group.items.map(([route, state, note]) => (
                  <article key={route} className="rounded-2xl border border-cyan-100/10 bg-white/[0.045] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <code className="font-mono text-sm font-black text-cyan-100">{route}</code>
                      <span className="rounded-full border border-cyan-100/20 bg-cyan-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-950">{state}</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-200/76">{note}</p>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
        <nav className="mt-6 flex flex-wrap gap-3" aria-label="Status route navigation">
          <Link className="rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950 no-underline" href="/home">Open Home</Link>
          <Link className="rounded-full border border-white/20 px-5 py-3 text-sm font-black text-white no-underline" href="/ground">Open Ground</Link>
          <Link className="rounded-full border border-white/20 px-5 py-3 text-sm font-black text-white no-underline" href="/life-map">Open Life Map</Link>
          <Link className="rounded-full border border-white/20 px-5 py-3 text-sm font-black text-white no-underline" href="/spatial/ar-vr">Open XR</Link>
        </nav>
      </section>
    </main>
  )
}
