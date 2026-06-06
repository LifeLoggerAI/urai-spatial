import Link from 'next/link'
import { DEMO_COUNCIL_AGENTS } from './councilAgentSchema'

export function CouncilRealm() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative min-h-screen overflow-hidden p-6 md:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_48%_18%,rgba(167,139,250,0.16),transparent_30%),radial-gradient(circle_at_80%_72%,rgba(103,232,249,0.12),transparent_28%)]" />
        <div className="relative z-10 mx-auto max-w-6xl">
          <p className="text-xs uppercase tracking-[0.45em] text-cyan-100/70">URAI Council</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-6xl">Guides for the spatial world.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200 md:text-base">
            Council agents explain places, exports, permissions, and safe next steps without exposing raw private data.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {DEMO_COUNCIL_AGENTS.map((agent) => (
              <article key={agent.id} className="rounded-3xl border border-white/10 bg-white/[0.07] p-5 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{agent.role}</p>
                <h2 className="mt-3 text-xl font-semibold">{agent.name}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-300">{agent.focus}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-white/15 px-3 py-1">Tone: {agent.tone}</span>
                  <span className="rounded-full border border-white/15 px-3 py-1">Places: {agent.canExplainPlaces ? 'yes' : 'no'}</span>
                  <span className="rounded-full border border-white/15 px-3 py-1">Exports: {agent.canExplainExports ? 'yes' : 'no'}</span>
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
            <Link className="rounded-full border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10" href="/passport">
              Passport
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
