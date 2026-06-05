import Link from 'next/link'
import { MemoryPlace } from './memoryPlaceSchema'
import { PlaceObject } from './placeObjectSchema'

export function PlaceReplayScene({ place, objects }: { place: MemoryPlace; objects: PlaceObject[] }) {
  const firstObject = objects[0]

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(103,232,249,0.16),transparent_28%),radial-gradient(circle_at_70%_70%,rgba(240,171,252,0.12),transparent_30%)]" />
        <div className="relative z-10 w-full max-w-3xl rounded-[2rem] border border-white/10 bg-white/[0.07] p-6 shadow-2xl backdrop-blur md:p-8">
          <p className="text-xs uppercase tracking-[0.45em] text-cyan-100/70">Place Replay</p>
          <h1 className="mt-3 text-3xl font-semibold md:text-5xl">{place.title}</h1>
          <p className="mt-4 leading-7 text-slate-200">
            This first replay pass uses safe symbolic beats from the place scene. Object-targeted camera movement and animation can build on this route next.
          </p>

          <div className="mt-6 grid gap-3">
            <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Beat 1</p>
              <h2 className="mt-2 font-semibold">Enter the place</h2>
              <p className="mt-2 text-sm text-slate-300">The scene opens at {place.reconstruction.scenePreset} with {place.locationPrivacy} location precision.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Beat 2</p>
              <h2 className="mt-2 font-semibold">Focus an object</h2>
              <p className="mt-2 text-sm text-slate-300">{firstObject ? `${firstObject.label} is the first replay anchor.` : 'No object anchor is available yet.'}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Beat 3</p>
              <h2 className="mt-2 font-semibold">Return safely</h2>
              <p className="mt-2 text-sm text-slate-300">Replay exits back to the place, LifeMap, or Home.</p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-100" href={`/place/${encodeURIComponent(place.id)}`}>
              Back to Place
            </Link>
            <Link className="rounded-full border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10" href="/life-map">
              LifeMap
            </Link>
            <Link className="rounded-full border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10" href="/">
              Home
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
