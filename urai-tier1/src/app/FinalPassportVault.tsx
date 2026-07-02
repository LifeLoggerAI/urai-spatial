import Link from 'next/link'

const vaultRows = [
  ['Identity', 'Private profile, owner, and device context stay under user control.'],
  ['Consent', 'Route access, exports, model access, and sharing remain explicit choices.'],
  ['Provenance', 'Memory sources, generated surfaces, and route history stay inspectable.'],
  ['Portability', 'Export, delete, review, and revoke actions are visible before launch.'],
] as const

export default function FinalPassportVault() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#03040a] text-white" data-testid="urai-final-passport-vault" data-route-polish="identity-consent-vault">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,236,190,0.2),transparent_26%),radial-gradient(circle_at_72%_60%,rgba(125,211,252,0.16),transparent_28%),linear-gradient(180deg,#03040a_0%,#101015_55%,#020307_100%)]" />
      <div className="absolute inset-0 bg-[url('/assets/urai/final/tier2/passport/passport-vault-desktop.svg')] bg-cover bg-center opacity-50 mix-blend-screen brightness-75 contrast-125 saturate-150" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,transparent_0_32%,rgba(0,0,0,0.62)_76%,rgba(0,0,0,0.96)_100%)]" />

      <section className="relative z-10 grid min-h-screen items-center gap-8 px-5 pb-28 pt-20 lg:grid-cols-[minmax(0,1fr)_460px] lg:px-10">
        <div className="max-w-5xl">
          <p className="text-xs font-black uppercase tracking-[0.42em] text-amber-100/80">URAI Passport</p>
          <h1 className="mt-5 max-w-[10ch] text-[clamp(4.8rem,11vw,10rem)] font-black leading-[0.78] tracking-[-0.12em] text-[#fff7e8]">Your life stays yours.</h1>
          <p className="mt-6 max-w-2xl text-base font-semibold leading-8 text-slate-100/82 md:text-lg">Passport is the ownership vault for identity, permissions, provenance, exports, deletion, and consent. It is private by default.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/privacy-controls" className="rounded-full bg-amber-100 px-5 py-3 text-sm font-black text-slate-950 no-underline">Open Privacy Controls</Link>
            <Link href="/status" className="rounded-full border border-white/20 bg-slate-950/55 px-5 py-3 text-sm font-black text-white no-underline backdrop-blur-xl">View Status</Link>
          </div>
        </div>
        <aside className="rounded-[2rem] border border-amber-100/15 bg-slate-950/68 p-5 shadow-2xl shadow-black/40 backdrop-blur-2xl">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-amber-100/80">Vault layers</p>
          <div className="mt-4 grid gap-3">
            {vaultRows.map(([title, copy], index) => (
              <article key={title} className="rounded-2xl border border-white/10 bg-white/[0.055] p-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-black tracking-tight">{title}</h2>
                  <span className="rounded-full border border-amber-100/20 px-2 py-1 text-xs font-black text-amber-100/85">{String(index + 1).padStart(2, '0')}</span>
                </div>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">{copy}</p>
              </article>
            ))}
          </div>
        </aside>
      </section>

      <nav className="fixed bottom-4 left-1/2 z-30 flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 gap-2 overflow-x-auto rounded-full border border-white/10 bg-slate-950/70 p-2 shadow-2xl shadow-black/40 backdrop-blur-2xl" aria-label="URAI passport route chain">
        {[["Home","/home"],["Ground","/ground"],["Life Map","/life-map"],["Mirror","/mirror"],["Privacy","/privacy-controls"],["Status","/status"]].map(([label, href]) => <Link key={href} href={href} className="rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white no-underline hover:bg-white hover:text-slate-950">{label}</Link>)}
      </nav>
    </main>
  )
}
