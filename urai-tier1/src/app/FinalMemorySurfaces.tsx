import Link from 'next/link'

const rail = [
  ['Home', '/home'],
  ['Ground', '/ground'],
  ['Life Map', '/life-map'],
  ['Focus', '/focus'],
  ['Replay', '/replay'],
  ['Mirror', '/mirror'],
  ['Passport', '/passport'],
  ['Status', '/status'],
] as const

function RouteRail({ active }: { active: string }) {
  return (
    <nav className="fixed bottom-4 left-1/2 z-30 flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 gap-2 overflow-x-auto rounded-full border border-white/10 bg-slate-950/70 p-2 shadow-2xl shadow-black/40 backdrop-blur-2xl" aria-label="URAI route chain">
      {rail.map(([label, href]) => (
        <Link key={href} href={href} data-active={label === active ? 'true' : 'false'} className="rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white no-underline data-[active=true]:bg-cyan-100 data-[active=true]:text-slate-950 hover:bg-white hover:text-slate-950">
          {label}
        </Link>
      ))}
    </nav>
  )
}

export function FinalFocusChamber() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020713] text-white" data-testid="urai-final-focus-chamber" data-route-polish="selected-memory-chamber">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(125,211,252,0.24),transparent_26%),radial-gradient(circle_at_74%_54%,rgba(255,122,214,0.13),transparent_30%),linear-gradient(180deg,#020713_0%,#061321_56%,#01040a_100%)]" />
      <div className="absolute inset-0 bg-[url('/assets/urai/focus/focus-memory-chamber-main.webp')] bg-cover bg-center opacity-50 mix-blend-screen brightness-75 contrast-125 saturate-150" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,transparent_0_34%,rgba(0,0,0,0.55)_74%,rgba(0,0,0,0.95)_100%)]" />

      <section className="relative z-10 grid min-h-screen items-center gap-8 px-5 pb-28 pt-20 lg:grid-cols-[minmax(0,1fr)_430px] lg:px-10">
        <div className="max-w-4xl">
          <p className="text-xs font-black uppercase tracking-[0.42em] text-cyan-200">Selected memory chamber</p>
          <h1 className="mt-5 max-w-[10ch] text-[clamp(4.5rem,11vw,10rem)] font-black leading-[0.78] tracking-[-0.12em] text-[#fff8ee]">The Quiet Reset.</h1>
          <p className="mt-6 max-w-2xl text-base font-semibold leading-8 text-slate-100/82 md:text-lg">
            Focus opens one memory from the Life Map as a room: image, signal, title, orb guidance, and one clear doorway into Replay.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread" className="rounded-full bg-cyan-100 px-5 py-3 text-sm font-black text-slate-950 no-underline shadow-2xl shadow-cyan-400/20">Enter Replay</Link>
            <Link href="/life-map" className="rounded-full border border-white/20 bg-slate-950/55 px-5 py-3 text-sm font-black text-white no-underline backdrop-blur-xl">Back to Life Map</Link>
          </div>
        </div>

        <aside className="rounded-[2rem] border border-cyan-100/15 bg-slate-950/62 p-5 shadow-2xl shadow-cyan-950/30 backdrop-blur-2xl">
          <div className="mb-5 aspect-[4/5] rounded-[1.5rem] border border-white/10 bg-[url('/assets/urai/memories/focus-first-light.png')] bg-cover bg-center shadow-[inset_0_0_70px_rgba(255,255,255,0.08)]" />
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">Orb readout</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-100/78">One memory is selected. Replay is one action away. Nothing leaves this chamber without permission.</p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-200/75">
            <span className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">Image</span>
            <span className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">Signal</span>
            <span className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">Replay</span>
          </div>
        </aside>
      </section>
      <RouteRail active="Focus" />
    </main>
  )
}

export function FinalReplayFilm() {
  const beats = ['Pressure', 'Orb', 'Ground', 'Life Map', 'Focus', 'Replay', 'Mirror', 'Passport'] as const
  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white" data-testid="urai-final-replay-film" data-route-polish="cinematic-memory-film">
      <div className="absolute inset-0 bg-[url('/assets/urai/replay/replay-memory-film-main.webp')] bg-cover bg-center opacity-55 brightness-75 contrast-125 saturate-150" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.92),transparent_32%,transparent_68%,rgba(0,0,0,0.92)),radial-gradient(ellipse_at_50%_52%,transparent_0_28%,rgba(0,0,0,0.72)_78%,rgba(0,0,0,0.98)_100%)]" />
      <div className="absolute left-1/2 top-1/2 h-[min(62vw,620px)] w-[min(78vw,980px)] -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border border-white/12 bg-white/[0.025] shadow-[0_0_160px_rgba(125,211,252,0.16),inset_0_0_120px_rgba(255,255,255,0.04)]" />

      <section className="relative z-10 grid min-h-screen items-center gap-8 px-5 pb-28 pt-20 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-10">
        <div className="max-w-5xl">
          <p className="text-xs font-black uppercase tracking-[0.42em] text-cyan-200">Cinematic memory film</p>
          <h1 className="mt-5 max-w-[11ch] text-[clamp(4.5rem,11vw,10rem)] font-black leading-[0.78] tracking-[-0.12em]">Replay the thread.</h1>
          <p className="mt-6 max-w-2xl text-base font-semibold leading-8 text-slate-100/82 md:text-lg">
            Replay turns a selected memory into a sequence you can move through: the moment, the signal, the world, the mirror, and the ownership boundary.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/mirror" className="rounded-full bg-cyan-100 px-5 py-3 text-sm font-black text-slate-950 no-underline">Open Mirror</Link>
            <Link href="/focus" className="rounded-full border border-white/20 bg-slate-950/55 px-5 py-3 text-sm font-black text-white no-underline backdrop-blur-xl">Return Focus</Link>
          </div>
        </div>
        <aside className="rounded-[2rem] border border-white/12 bg-slate-950/68 p-5 shadow-2xl shadow-black/40 backdrop-blur-2xl">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">Film beats</p>
          <div className="mt-4 grid gap-2">
            {beats.map((beat, index) => (
              <div key={beat} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.055] p-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-100 text-xs font-black text-slate-950">{index + 1}</span>
                <strong className="text-sm">{beat}</strong>
              </div>
            ))}
          </div>
        </aside>
      </section>
      <RouteRail active="Replay" />
    </main>
  )
}
