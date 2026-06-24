import Link from 'next/link'
import { DEMO_PASSPORT_PERMISSIONS } from './passportPermissionSchema'

const vaultStates = [
  ['Identity', 'private by default'],
  ['Provenance', 'source visible'],
  ['Models', 'access gated'],
  ['Exports', 'portable when allowed'],
] as const

export function PassportRealm() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#030712] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_52%_20%,rgba(125,211,252,.2),transparent_28rem),radial-gradient(circle_at_20%_82%,rgba(251,191,36,.12),transparent_26rem)]" />
      <div className="absolute left-1/2 top-[44%] h-[32rem] w-[min(42rem,76vw)] -translate-x-1/2 -translate-y-1/2 rounded-[2.5rem] border border-cyan-100/20 bg-white/[.035] shadow-[0_0_130px_rgba(103,232,249,.16),inset_0_0_90px_rgba(255,255,255,.045)]" />

      <section className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 md:px-10">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.45em] text-cyan-100/70">URAI Passport</p>
            <h1 className="mt-4 max-w-4xl text-5xl font-semibold leading-[.9] tracking-[-0.08em] md:text-7xl">
              Your world has borders. You hold the keys.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-200/82">
              Passport turns identity, permissions, provenance, exports, deletion, and model access into a visible vault instead of hidden settings.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {vaultStates.map(([label, detail]) => (
              <span key={label} className="rounded-full border border-white/15 bg-white/[.05] px-3 py-2 text-xs font-black text-slate-200">
                {label}: {detail}
              </span>
            ))}
          </div>
        </header>

        <div className="mt-10 grid flex-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {DEMO_PASSPORT_PERMISSIONS.map((permission) => (
            <article key={permission.id} className="rounded-[2rem] border border-white/10 bg-black/35 p-5 shadow-[0_24px_90px_rgba(0,0,0,.35)] backdrop-blur-xl">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-100/70">{permission.category}</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">{permission.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">{permission.creates}</p>
              <p className="mt-4 rounded-2xl border border-cyan-100/10 bg-cyan-100/5 p-3 text-xs leading-5 text-cyan-50">{permission.privacyNote}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-white/15 px-3 py-1">State: {permission.state}</span>
                <span className="rounded-full border border-white/15 px-3 py-1">Export: {permission.canExport ? 'yes' : 'no'}</span>
                <span className="rounded-full border border-white/15 px-3 py-1">Delete: {permission.canDelete ? 'yes' : 'no'}</span>
              </div>
            </article>
          ))}
        </div>

        <nav className="mt-10 flex flex-wrap gap-3 pb-8">
          <Link className="rounded-full bg-cyan-100 px-5 py-3 text-sm font-black text-slate-950 hover:bg-white" href="/home">Return Home</Link>
          <Link className="rounded-full border border-white/20 px-5 py-3 text-sm font-black text-white hover:bg-white/10" href="/privacy-controls">Privacy Controls</Link>
          <Link className="rounded-full border border-white/20 px-5 py-3 text-sm font-black text-white hover:bg-white/10" href="/location-map">Location Map</Link>
          <Link className="rounded-full border border-white/20 px-5 py-3 text-sm font-black text-white hover:bg-white/10" href="/life-map">Life Map</Link>
        </nav>
      </section>
    </main>
  )
}
