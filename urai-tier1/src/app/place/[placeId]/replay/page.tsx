import Link from 'next/link'
import { PlaceReplayScene } from '@/spatial/places/PlaceReplayScene'
import { listMemoryPlaceObjects, resolveMemoryPlace } from '@/spatial/places/memoryPlaceRepository'

type PlaceReplayPageProps = {
  params: Promise<{
    placeId: string
  }>
}

export default async function PlaceReplayPage({ params }: PlaceReplayPageProps) {
  const { placeId } = await params
  const resolved = await resolveMemoryPlace(placeId)

  if (!resolved.ok) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white" data-place-replay-authority="legacy-fail-closed-no-demo-substitution">
        <section className="max-w-xl rounded-3xl border border-white/10 bg-white/10 p-8 text-center backdrop-blur">
          <p className="text-xs uppercase tracking-[0.4em] text-cyan-100/70">Place Replay</p>
          <h1 className="mt-3 text-3xl font-semibold">Source-backed replay required</h1>
          <p className="mt-3 text-sm text-slate-200">
            UrAi will not replay a demo place as personal memory. Return to Ground and enter Replay only from an authorized place-bound memory context.
          </p>
          <Link className="mt-6 inline-flex rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-950" href="/ground">
            Return to Ground
          </Link>
        </section>
      </main>
    )
  }

  return <PlaceReplayScene place={resolved.place} objects={await listMemoryPlaceObjects(resolved.place.id)} />
}
