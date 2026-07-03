import Link from 'next/link'
import type { CSSProperties } from 'react'
import { assetCssStack, locationMapAssets } from '@/spatial/assets/uraiAssets'
import { MemoryPlace } from './memoryPlaceSchema'

function placeTone(place: MemoryPlace) {
  return place.emotionalOverlay.auraColor || '#67e8f9'
}

const locationStyle = {
  '--location-art-desktop': assetCssStack(locationMapAssets.primary),
  '--location-art-mobile': assetCssStack(locationMapAssets.mobile),
  '--location-place-node': assetCssStack(locationMapAssets.accents.placeNode),
} as CSSProperties

const desktopArtStyle = { backgroundImage: 'var(--location-art-desktop)' } as CSSProperties
const mobileArtStyle = { backgroundImage: 'var(--location-art-mobile)' } as CSSProperties
const placeNodeStyle = { backgroundImage: 'var(--location-place-node)' } as CSSProperties

export function LocationMapScene({ places }: { places: MemoryPlace[] }) {
  return (
    <main
      className="relative h-[100svh] max-h-[100svh] min-h-[100svh] overflow-hidden bg-[#020617] text-white"
      data-launch-surface="premium-emotional-weather-atlas"
      style={locationStyle}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(103,232,249,0.16),transparent_28rem),radial-gradient(circle_at_20%_76%,rgba(167,139,250,0.14),transparent_28rem),radial-gradient(circle_at_78%_78%,rgba(251,191,36,.10),transparent_26rem)]" />
      <div className="absolute inset-0 hidden bg-cover bg-center opacity-45 mix-blend-screen brightness-70 contrast-125 saturate-150 md:block" style={desktopArtStyle} />
      <div className="absolute inset-0 bg-cover bg-center opacity-42 mix-blend-screen brightness-65 contrast-125 saturate-150 md:hidden" style={mobileArtStyle} />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,.28),rgba(2,6,23,.62)_52%,rgba(0,0,0,.88)),radial-gradient(ellipse_at_50%_50%,transparent_0_34%,rgba(0,0,0,.62)_82%)]" />
      <div className="absolute left-1/2 top-[54%] h-[min(42rem,82vw)] w-[min(42rem,82vw)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-100/20 bg-[radial-gradient(circle,rgba(103,232,249,.08),rgba(2,6,23,.1)_55%,rgba(0,0,0,.48))] shadow-[0_0_140px_rgba(103,232,249,.12),inset_0_0_90px_rgba(255,255,255,.035)]" />

      <section className="relative z-10 mx-auto flex h-full max-h-[100svh] max-w-7xl flex-col overflow-hidden px-4 py-4 md:px-10 md:py-8">
        <header className="flex shrink-0 flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.42em] text-cyan-100/70 md:text-xs">Location Map</p>
            <h1 className="mt-3 max-w-4xl text-[2.45rem] font-semibold leading-[.88] tracking-[-0.08em] md:mt-4 md:text-7xl">
              Emotional weather over private places.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-200/82 md:mt-6 md:text-base md:leading-8">
              A symbolic atlas where places hold memory intensity, privacy precision, replay doors, and the weather of what life felt like there.
            </p>
          </div>
          <div className="flex shrink-0 gap-3">
            <Link className="rounded-full border border-white/20 bg-black/30 px-4 py-2 text-sm font-black text-white backdrop-blur-xl hover:bg-white/10" href="/life-map">Life Map</Link>
            <Link className="rounded-full bg-cyan-100 px-4 py-2 text-sm font-black text-slate-950 hover:bg-white" href="/home">Home</Link>
          </div>
        </header>

        <section className="mt-4 grid shrink-0 grid-cols-2 gap-2 md:mt-8 md:grid-cols-4 md:gap-3" aria-label="Global emotional weather legend">
          {['Calm field', 'Threshold storm', 'Recovery glow', 'Memory fog'].map((label) => (
            <article key={label} className="rounded-2xl border border-white/10 bg-black/42 p-3 shadow-[0_18px_55px_rgba(0,0,0,.24)] backdrop-blur-2xl md:p-4">
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/70 md:text-xs md:tracking-[0.26em]">{label}</span>
              <p className="mt-1 text-xs text-slate-300 md:mt-2 md:text-sm">private signal layer</p>
            </article>
          ))}
        </section>

        <div className="relative mt-4 grid min-h-0 flex-1 gap-3 overflow-y-auto pr-1 md:mt-8 md:grid-cols-2 md:gap-4 lg:grid-cols-3" aria-label="Private place memory doors">
          {places.map((place, index) => (
            <Link
              key={place.id}
              href={`/place/${encodeURIComponent(place.id)}`}
              className="group relative min-h-[11.5rem] overflow-hidden rounded-[1.6rem] border border-white/10 bg-black/45 p-4 shadow-[0_26px_90px_rgba(0,0,0,.42)] backdrop-blur-2xl transition duration-300 hover:-translate-y-1 hover:border-cyan-100/25 hover:bg-black/55 md:rounded-[2rem] md:p-5"
            >
              <div className="absolute -right-8 -top-8 h-40 w-40 bg-contain bg-center bg-no-repeat opacity-20 mix-blend-screen transition duration-500 group-hover:scale-110 group-hover:opacity-35" style={placeNodeStyle} />
              <div
                className="absolute right-4 top-4 h-20 w-20 rounded-full blur-2xl transition group-hover:scale-125"
                style={{ background: placeTone(place), opacity: 0.26 + Math.min(0.42, place.emotionalOverlay.intensity / 3) }}
              />
              <div className="relative">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-300 md:text-xs md:tracking-[0.3em]">{place.category}</p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight md:mt-3 md:text-2xl">{place.title}</h2>
                <p className="mt-2 text-xs leading-5 text-slate-300 md:mt-3 md:text-sm md:leading-6">
                  {place.kind} place · {place.locationPrivacy} · {place.reconstruction.scenePreset}
                </p>
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/35 p-3 text-xs leading-5 text-slate-300 md:mt-5">
                  Weather intensity: {Math.round(place.emotionalOverlay.intensity * 100)}% · linked memory markers stay permissioned.
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-slate-400 md:mt-6">
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
