import Link from 'next/link'
import { DEMO_PASSPORT_PERMISSIONS } from './passportPermissionSchema'

export function PassportRealm() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative min-h-screen overflow-hidden p-6 md:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(103,232,249,0.16),transparent_28%),radial-gradient(circle_at_20%_80%,rgba(255,255,255,0.08),transparent_28%)]" />
        <div className="relative z-10 mx-auto max-w-6xl">
          <p className="text-xs uppercase tracking-[0.45em] text-cyan-100/70">URAI Passport</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-6xl">Your world permissions.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200 md:text-base">
            Passport explains what data categories can create spatial features, what they produce, and which controls remain available.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {DEMO_PASSPORT_PERMISSIONS.map((permission) => (
              <article key={permission.id} className="rounded-3xl border border-white/10 bg-white/[0.07] p-5 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{permission.category}</p>
                <h2 className="mt-3 text-xl font-semibold">{permission.title}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-300">{permission.creates}</p>
                <p className="mt-3 rounded-2xl border border-cyan-100/10 bg-cyan-100/5 p-3 text-xs text-cyan-50">{permission.privacyNote}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-white/15 px-3 py-1">State: {permission.state}</span>
                  <span className="rounded-full border border-white/15 px-3 py-1">Export: {permission.canExport ? 'yes' : 'no'}</span>
                  <span className="rounded-full border border-white/15 px-3 py-1">Delete: {permission.canDelete ? 'yes' : 'no'}</span>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-100" href="/">
              Return Home
            </Link>
            <Link className="rounded-full border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10" href="/location-map">
              Location Map
            </Link>
            <Link className="rounded-full border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10" href="/life-map">
              LifeMap
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
