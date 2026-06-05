import Link from 'next/link'
import { MemoryPlace } from './memoryPlaceSchema'

function placeTone(place: MemoryPlace) {
  return place.emotionalOverlay.auraColor || '#67e8f9'
}

export function LocationMapScene({ places }: { places: MemoryPlace[] }) {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative min-h-screen overflow-hidden px-6 py-8 md:px-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(103,232,249,0.16),transparent_28%),radial-gradient(circle_at_20%_70%,rgba(167,139,250,0.14),transparent_26%)]" />
        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col">
          <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.45em] text-cyan-100/70">Location Map</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-6xl">Places below the stars.</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200 md:text-base">
                A private symbolic atlas of memory places. Demo places use symbolic location precision by default.
              </p>
            </div>
            <div className="flex gap-3">
              <Link className="rounded-full border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10" href="/life-map">
                LifeMap
              </Link>
              <Link className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-100" href="/">
                Home
              </Link>
            </div>
          </header>

          <div className="relative mt-10 grid flex-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {places.map((place, index) => (
              <Link
                key={place.id}
                href={`/place/${encodeURIComponent(place.id)}`}
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur transition hover:-translate-y-1 hover:bg-white/[0.1]"
              >
                <div
                  className="absolute right-4 top-4 h-16 w-16 rounded-full blur-xl transition group-hover:scale-125"
                  style={{ background: placeTone(place), opacity: 0.24 + Math.min(0.4, place.emotionalOverlay.intensity / 3) }}
                />
                <div className="relative">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-300">{place.category}</p>
                  <h2 className="mt-3 text-xl font-semibold">{place.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    {place.kind} place · {place.locationPrivacy} · {place.reconstruction.scenePreset}
                  </p>
                  <div className="mt-6 flex items-center justify-between text-xs text-slate-400">
                    <span>{place.memoryIds.length} linked marker{place.memoryIds.length === 1 ? '' : 's'}</span>
                    <span>Door {index + 1}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
