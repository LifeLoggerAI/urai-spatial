import Link from 'next/link'
import { MemoryPlace } from './memoryPlaceSchema'

function placeTone(place: MemoryPlace) {
  return place.emotionalOverlay.auraColor || '#67e8f9'
}

export function LocationMapScene({ places }: { places: MemoryPlace[] }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020617] text-white" data-launch-surface="premium-emotional-weather-atlas">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(103,232,249,0.16),transparent_28rem),radial-gradient(circle_at_20%_76%,rgba(167,139,250,0.14),transparent_28rem),radial-gradient(circle_at_78%_78%,rgba(251,191,36,.10),transparent_26rem)]" />
      <div className="absolute left-1/2 top-[56%] h-[min(42rem,82vw)] w-[min(42rem,82vw)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-100/20 bg-[radial-gradient(circle,rgba(103,232,249,.08),rgba(2,6,23,.1)_55%,rgba(0,0,0,.48))] shadow-[0_0_140px_rgba(103,232,249,.12),inset_0_0_90px_rgba(255,255,255,.035)]" />

      <section className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 md:px-10">
        <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.45em] text-cyan-100/70">Location Map</p>
            <h1 className="mt-4 max-w-4xl text-5xl font-semibold leading-[.9] tracking-[-0.08em] md:text-7xl">
              Emotional weather over private places.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-200/82">
              A symbolic atlas where places hold memory intensity, privacy precision, replay doors, and the weather of what life felt like there.
            </p>
          </div>
          <div className="flex gap-3">
            <Link className="rounded-full border border-white/20 px-4 py-2 text-sm font-black text-white hover:bg-white/10" href="/life-map">Life Map</Link>
            <Link className="rounded-full bg-cyan-100 px-4 py-2 text-sm font-black text-slate-950 hover:bg-white" href="/home">Home</Link>
          </div>
        </header>

        <section className="mt-8 grid gap-3 md:grid-cols-4" aria-label="Global emotional weather legend">
          {['Calm field', 'Threshold storm', 'Recovery glow', 'Memory fog'].map((label) => (
            <article key={label} className="rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur-xl">
              <span className="text-xs font-black uppercase tracking-[0.26em] text-cyan-100/70">{label}</span>
              <p className="mt-2 text-sm text-slate-300">private signal layer</p>
            </article>
          ))}
        </section>

        <div className="relative mt-10 grid flex-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {places.map((place, index) => (
            <Link
              key={place.id}
              href={`/place/${encodeURIComponent(place.id)}`}
              className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 shadow-[0_26px_90px_rgba(0,0,0,.34)] backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/[0.1]"
            >
              <div
                className="absolute right-4 top-4 h-20 w-20 rounded-full blur-2xl transition group-hover:scale-125"
                style={{ background: placeTone(place), opacity: 0.26 + Math.min(0.42, place.emotionalOverlay.intensity / 3) }}
              />
              <div className="relative">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-300">{place.category}</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight">{place.title}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  {place.kind} place · {place.locationPrivacy} · {place.reconstruction.scenePreset}
                </p>
                <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-3 text-xs leading-5 text-slate-300">
                  Weather intensity: {Math.round(place.emotionalOverlay.intensity * 100)}% · linked memory markers stay permissioned.
                </div>
                <div className="mt-6 flex items-center justify-between text-xs text-slate-400">
                  <span>{place.memoryIds.length} linked marker{place.memoryIds.length === 1 ? '' : 's'}</span>
                  <span>Door {index + 1}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
