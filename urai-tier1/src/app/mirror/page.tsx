import Link from 'next/link'

export default function MirrorRoutePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020611] text-white" data-testid="urai-final-mirror-realm" data-route-polish="reflection-realm">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(125,211,252,0.24),transparent_28%),radial-gradient(circle_at_78%_68%,rgba(251,191,36,0.13),transparent_30%),linear-gradient(180deg,#020611_0%,#071325_58%,#010309_100%)]" />
      <div className="absolute inset-0 bg-[url('/assets/urai/mirror/mirror-reflection-main.webp')] bg-cover bg-center opacity-45 mix-blend-screen brightness-75 contrast-125 saturate-150" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,transparent_0_32%,rgba(0,0,0,0.58)_74%,rgba(0,0,0,0.94)_100%)]" />
      <section className="relative z-10 grid min-h-screen items-center gap-8 px-5 pb-28 pt-20 lg:grid-cols-[minmax(0,1fr)_440px] lg:px-10">
        <div className="max-w-5xl">
          <p className="text-xs font-black uppercase tracking-[0.45em] text-cyan-100/75">URAI Mirror</p>
          <h1 className="mt-5 max-w-[10ch] text-[clamp(4.8rem,11vw,10rem)] font-black leading-[0.78] tracking-[-0.12em]">See the pattern clearly.</h1>
          <p className="mt-6 max-w-2xl text-base font-semibold leading-8 text-slate-100/82 md:text-lg">Mirror is the reflection realm between memory and real life: a private pattern surface with orb guidance, boundaries, and safe next moves.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link className="rounded-full bg-cyan-100 px-5 py-3 text-sm font-black text-slate-950 no-underline" href="/focus">Open Focus</Link>
            <Link className="rounded-full border border-white/20 bg-slate-950/55 px-5 py-3 text-sm font-black text-white no-underline backdrop-blur-xl" href="/replay">Enter Replay</Link>
            <Link className="rounded-full border border-amber-100/25 bg-slate-950/55 px-5 py-3 text-sm font-black text-amber-50 no-underline backdrop-blur-xl" href="/passport">Open Passport</Link>
          </div>
        </div>
        <aside className="rounded-[2rem] border border-white/12 bg-slate-950/68 p-5 shadow-2xl shadow-black/40 backdrop-blur-2xl">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-200">Reflection stack</p>
          {['Pattern intelligence','Orb reflection','Consent layer','Return paths'].map((title, index) => (
            <article key={title} className="mt-3 rounded-2xl border border-white/10 bg-white/[0.055] p-4">
              <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-black tracking-tight">{title}</h2><span className="rounded-full border border-cyan-100/20 px-2 py-1 text-xs font-black text-cyan-100/85">{String(index + 1).padStart(2, '0')}</span></div>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">Private reflection stays readable, useful, and permissioned.</p>
            </article>
          ))}
        </aside>
      </section>
      <nav className="fixed bottom-4 left-1/2 z-30 flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 gap-2 overflow-x-auto rounded-full border border-white/10 bg-slate-950/70 p-2 shadow-2xl shadow-black/40 backdrop-blur-2xl" aria-label="URAI launch route chain">
        {[["Home","/home"],["Ground","/ground"],["Life Map","/life-map"],["Focus","/focus"],["Replay","/replay"],["Passport","/passport"],["Status","/status"]].map(([label, href]) => <Link key={href} href={href} className="rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white no-underline hover:bg-white hover:text-slate-950">{label}</Link>)}
      </nav>
    </main>
  )
}
