import Link from 'next/link'

const scenes = [
  ['Pressure', '/home'],
  ['Ground', '/ground'],
  ['Ascent', '/ascent'],
  ['Life Map', '/life-map'],
  ['Focus', '/focus'],
  ['Replay', '/replay'],
  ['Mirror', '/mirror'],
  ['Passport', '/passport'],
] as const

export default function ReplayFilmContent() {
  return (
    <main className="min-h-screen bg-[#03020a] px-5 py-16 text-white">
      <section className="mx-auto max-w-6xl">
        <p className="text-xs font-black uppercase tracking-[.45em] text-cyan-100/70">URAI · Cut One</p>
        <h1 className="mt-5 max-w-[10ch] text-[clamp(4rem,12vw,10rem)] font-black leading-[.78] tracking-[-.1em]">Your life is a world.</h1>
        <p className="mt-7 max-w-3xl text-lg leading-8 text-slate-200">A cinematic path through Home, Ground, Life Map, Focus, Replay, Mirror, and Passport.</p>
        <div className="mt-8 flex gap-3">
          <Link href="/home" className="rounded-full bg-white px-6 py-3 font-black text-slate-950">Enter Home</Link>
          <a href="#film" className="rounded-full border border-white/20 px-6 py-3 font-black text-white">Play the rail</a>
        </div>
      </section>
      <section id="film" className="mx-auto mt-16 grid max-w-6xl gap-4 md:grid-cols-2">
        {scenes.map(([title, href], index) => (
          <Link key={href} href={href} className="group min-h-72 rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_80%_10%,rgba(103,232,249,.18),transparent_18rem),linear-gradient(145deg,#11152a,#05040d)] p-8 no-underline transition hover:-translate-y-1 hover:border-cyan-100/30">
            <span className="text-xs font-black tracking-[.3em] text-cyan-100/60">{String(index + 1).padStart(2, '0')}</span>
            <h2 className="mt-24 text-5xl font-black tracking-[-.06em] text-white">{title}</h2>
            <p className="mt-4 text-slate-300">Enter the next layer.</p>
          </Link>
        ))}
      </section>
    </main>
  )
}
