import Link from 'next/link'
import { MemoryPlace } from './memoryPlaceSchema'
import { MemoryPlaceSafetyGate } from './memoryPlaceSafetyGate'

export function MemoryPlaceGatePanel({ place, gate }: { place: MemoryPlace; gate: MemoryPlaceSafetyGate }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
      <section className="max-w-2xl rounded-[2rem] border border-white/10 bg-white/10 p-8 text-center shadow-2xl backdrop-blur">
        <p className="text-xs uppercase tracking-[0.4em] text-cyan-100/70">Memory Place Gate</p>
        <h1 className="mt-3 text-3xl font-semibold md:text-5xl">Enter softly?</h1>
        <p className="mt-4 text-sm leading-7 text-slate-200 md:text-base">
          {place.title} is marked as {place.privacyLevel}. URAI can preview the doorway, return to the map, or enter the place when the required permission state allows it.
        </p>
        <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/45 p-4 text-left text-sm text-slate-300">
          <p>Gate level: {gate.level}</p>
          <p>Reason: {gate.reason}</p>
          <p>Actions: {gate.actions.join(', ')}</p>
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link className="rounded-full border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10" href="/location-map">
            Preview from Map
          </Link>
          <Link className="rounded-full border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10" href="/life-map">
            Back to LifeMap
          </Link>
          <Link className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-100" href="/">
            Home
          </Link>
        </div>
      </section>
    </main>
  )
}
