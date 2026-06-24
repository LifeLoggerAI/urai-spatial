import Link from 'next/link'

export const metadata = {
  title: 'URAI Mirror',
  description:
    'URAI Mirror is the private reflection realm where life patterns can be seen safely without exposing raw memory detail.',
}

const reflections = [
  ['Pattern mirror', 'Recurring pressure, repair, recovery, relationship, and attention loops become visible without exposing raw memory detail.'],
  ['Signal lens', 'Mood, place, time, focus, and body context become private signals that can be accepted, ignored, or deleted.'],
  ['Care boundary', 'Reflection stays separate from judgement, public identity, automatic action, or model access.'],
  ['Next step', 'Choose one grounded move: return to Ground, revisit Focus, enter Replay, or protect the thread in Passport.'],
] as const

const rail = [
  ['Home', '/home'],
  ['Ground', '/ground'],
  ['Life Map', '/life-map'],
  ['Focus', '/focus'],
  ['Replay', '/replay'],
  ['Passport', '/passport'],
  ['Status', '/status'],
] as const

export default function MirrorRoutePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020611] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_22%,rgba(125,211,252,.22),transparent_28rem),radial-gradient(circle_at_18%_72%,rgba(251,191,36,.12),transparent_24rem),linear-gradient(180deg,rgba(5,11,27,.1),rgba(0,0,0,.72))]" />
      <div className="absolute left-1/2 top-[50%] h-[38rem] w-[min(58rem,82vw)] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-cyan-100/20 bg-white/[.035] shadow-[0_0_140px_rgba(103,232,249,.14),inset_0_0_100px_rgba(255,255,255,.045)] backdrop-blur" />
      <div className="absolute left-1/2 top-[50%] h-[26rem] w-[min(42rem,68vw)] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-amber-100/20 bg-[radial-gradient(circle_at_50%_44%,rgba(255,255,255,.38),rgba(125,211,252,.10)_31%,rgba(2,6,23,.82)_70%)]" />

      <section className="relative z-10 grid min-h-screen gap-8 px-6 py-8 md:px-10 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,34rem)]">
        <div className="flex max-w-3xl flex-col justify-center py-20">
          <p className="text-xs font-black uppercase tracking-[0.45em] text-cyan-100/70">URAI Mirror</p>
          <h1 className="mt-4 max-w-4xl text-5xl font-semibold leading-[.9] tracking-[-0.08em] md:text-7xl">
            See the pattern without exposing the person.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-slate-200/82">
            Mirror is the private reflection room between memory and real life. It shows loops, signals, and care boundaries as an inspectable surface before anything becomes action.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="rounded-full bg-cyan-100 px-5 py-3 text-sm font-black text-slate-950 hover:bg-white" href="/focus">Open Focus</Link>
            <Link className="rounded-full border border-white/20 px-5 py-3 text-sm font-black text-white hover:bg-white/10" href="/replay">Enter Replay</Link>
            <Link className="rounded-full border border-amber-100/25 px-5 py-3 text-sm font-black text-amber-50 hover:bg-amber-100/10" href="/passport">Protect in Passport</Link>
          </div>
        </div>

        <aside className="self-center rounded-[2rem] border border-white/10 bg-black/35 p-4 shadow-[0_30px_120px_rgba(0,0,0,.45)] backdrop-blur-2xl">
          <p className="text-xs font-black uppercase tracking-[0.32em] text-cyan-100/70">Private reflection stack</p>
          <div className="mt-4 grid gap-3">
            {reflections.map(([title, copy], index) => (
              <article key={title} className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
                  <span className="rounded-full border border-cyan-100/20 px-2 py-1 text-xs text-cyan-100/80">{String(index + 1).padStart(2, '0')}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-300">{copy}</p>
              </article>
            ))}
          </div>
        </aside>
      </section>

      <nav className="fixed bottom-4 left-1/2 z-20 flex w-[min(48rem,calc(100vw-2rem))] -translate-x-1/2 flex-wrap justify-center gap-2 rounded-full border border-white/10 bg-slate-950/70 p-2 backdrop-blur-xl" aria-label="URAI launch route chain">
        {rail.map(([label, href]) => (
          <Link key={href} href={href} className="rounded-full px-3 py-2 text-xs font-black text-slate-200 hover:bg-white/10">{label}</Link>
        ))}
      </nav>
    </main>
  )
}
