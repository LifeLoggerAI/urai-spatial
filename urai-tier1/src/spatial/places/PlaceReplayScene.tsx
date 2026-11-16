import InstitutionalPublicSurface from '@/app/InstitutionalPublicSurface'
import { makeDemoPlaceReplayBeats } from '@/spatial/replay/placeReplayBeatSchema'
import { getSpatialCueMetadata } from '@/spatial/runtime/spatialCueMetadata'
import { MemoryPlace } from './memoryPlaceSchema'
import { PlaceObject } from './placeObjectSchema'

export function PlaceReplayScene({ place, objects }: { place: MemoryPlace; objects: PlaceObject[] }) {
  const beats = makeDemoPlaceReplayBeats(place.id, objects.map((object) => object.id))
  const cue = getSpatialCueMetadata('start-replay', 'start-replay')

  return (
    <InstitutionalPublicSurface
      eyebrow="Place replay · Sample"
      title={place.title}
      lede="Follow a short written journey through this place. This sample is an illustration, not a recording of an event."
      links={[{ href: `/place/${encodeURIComponent(place.id)}`, label: 'Back to Place', primary: true }, { href: '/life-map', label: 'Life Map' }, { href: '/', label: 'Home' }]}
    >
          <details>
            <summary style={{ minHeight: 44, cursor: 'pointer', color: '#b9f4ff' }}>About the sample cues</summary>
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
            <p className="font-semibold text-slate-100">Replay sensory cue</p>
            <p className="mt-1">Sound: {cue.soundLabel} · Haptic: {cue.hapticLabel}</p>
            <p className="mt-1">Reduced-motion safe: {cue.reducedMotionSafe ? 'yes' : 'no'} · Privacy-safe: {cue.privacySafe ? 'yes' : 'no'}</p>
          </div>

          </details>
          <div className="mt-6 grid gap-3">
            {beats.map((beat, index) => {
              const targetObject = beat.targetPlaceObjectId ? objects.find((object) => object.id === beat.targetPlaceObjectId) : undefined
              return (
                <div key={beat.id} className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Moment {index + 1}</p>
                  <h2 className="mt-2 font-semibold">{beat.title}</h2>
                  <p className="mt-2 text-sm text-slate-300">{beat.narratorText}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {targetObject ? `In this moment: ${targetObject.label}` : 'Read at your own pace.'}
                  </p>
                </div>
              )
            })}
          </div>

    </InstitutionalPublicSurface>
  )
}
