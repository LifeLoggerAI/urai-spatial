import Link from 'next/link'

const routes = [
  ['Ground', '/ground', 'Descend into the private operating world'],
  ['Life Map', '/life-map', 'Ascend into the private memory galaxy'],
  ['Focus', '/focus', 'Open a selected memory chamber'],
  ['Replay', '/replay', 'Enter a memory film'],
  ['Mirror', '/mirror', 'Reflect patterns with the orb'],
  ['Passport', '/passport', 'Open ownership and consent'],
] as const

export default function FinalHomeThreshold() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020713] text-white" data-testid="urai-final-home-threshold" data-home-final="cinematic-private-world">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(255,236,190,0.32),transparent_18%),radial-gradient(circle_at_50%_62%,rgba(96,239,255,0.18),transparent_32%),linear-gradient(180deg,#020713_0%,#071523_46%,#02060b_100%)]" />
      <div className="absolute inset-0 bg-[url('/assets/urai/home/home-threshold-main.webp')] bg-cover bg-center opacity-55 mix-blend-screen brightness-75 contrast-125 saturate-150" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_44%,transparent_0_30%,rgba(0,0,0,0.42)_68%,rgba(0,0,0,0.92)_100%),linear-gradient(90deg,rgba(0,0,0,0.76),transparent_30%,transparent_70%,rgba(0,0,0,0.76))]" />

      <Link href="/life-map" aria-label="Ascend to Life Map" className="absolute inset-x-0 top-0 z-10 h-[48vh] cursor-n-resize" />
      <Link href="/ground" aria-label="Descend to Ground" className="absolute inset-x-0 bottom-0 z-10 h-[46vh] cursor-s-resize" />

      <section className="pointer-events-none absolute left-1/2 top-[52%] z-20 h-[min(42vw,430px)] w-[min(42vw,430px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_38%_28%,white_0_8%,rgba(255,255,255,0.55)_9%_17%,transparent_18%),radial-gradient(circle,#fff4ca_0_13%,#7df8ff_28%,rgba(15,35,58,0.98)_61%,rgba(0,0,0,0)_72%)] shadow-[0_0_90px_rgba(126,248,255,0.58),0_0_190px_rgba(255,231,180,0.2)]" aria-hidden="true" />
      <section className="pointer-events-none absolute left-1/2 top-[68%] z-20 h-[22vh] w-[min(72vw,760px)] -translate-x-1/2 rounded-[50%] border border-cyan-100/15 bg-cyan-100/5 shadow-[inset_0_0_90px_rgba(125,248,255,0.08),0_0_90px_rgba(0,0,0,0.5)]" aria-hidden="true" />

      <header className="relative z-30 flex items-center justify-between gap-4 px-5 py-5 md:px-8">
        <Link href="/home" className="rounded-full border border-white/15 bg-slate-950/55 px-4 py-2 text-xs font-black uppercase tracking-[0.26em] text-cyan-50 no-underline backdrop-blur-xl">URAI</Link>
        <nav className="flex max-w-[70vw] gap-2 overflow-x-auto rounded-full border border-white/10 bg-slate-950/55 p-2 backdrop-blur-xl" aria-label="Home route rail">
          {routes.map(([label, href]) => (
            <Link key={href} href={href} className="rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white no-underline hover:bg-white hover:text-slate-950">{label}</Link>
          ))}
        </nav>
      </header>

      <section className="relative z-30 grid min-h-[calc(100svh-96px)] items-center px-5 pb-28 pt-10 md:px-10">
        <div className="max-w-[900px]">
          <p className="text-xs font-black uppercase tracking-[0.42em] text-cyan-200">Own your life. Step inside yourself.</p>
          <h1 className="mt-5 max-w-[9ch] text-[clamp(5rem,13vw,12rem)] font-black leading-[0.76] tracking-[-0.12em] text-[#fff7e8] drop-shadow-2xl">Your world is open.</h1>
          <p className="mt-6 max-w-2xl text-base font-semibold leading-8 text-slate-100/82 md:text-lg">
            Sky ascends into the Life Map. Ground descends into the private operating world. The orb stays with you at the threshold.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/life-map" className="rounded-full bg-cyan-100 px-5 py-3 text-sm font-black text-slate-950 no-underline shadow-2xl shadow-cyan-400/20">Ascend to Life Map</Link>
            <Link href="/ground" className="rounded-full border border-white/20 bg-slate-950/58 px-5 py-3 text-sm font-black text-white no-underline backdrop-blur-xl">Descend to Ground</Link>
          </div>
        </div>
      </section>

      <aside className="absolute bottom-5 right-5 z-30 w-[min(360px,calc(100vw-40px))] rounded-3xl border border-white/12 bg-slate-950/65 p-4 shadow-2xl shadow-black/40 backdrop-blur-2xl">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">Orb companion</p>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-100/78">Tap the sky to rise. Tap the ground to enter the private world below. No hover-only gate.</p>
      </aside>
    </main>
  )
}
