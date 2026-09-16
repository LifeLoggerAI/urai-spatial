import Link from 'next/link'
import { MemoryPlaceGatePanel } from '@/spatial/places/MemoryPlaceGatePanel'
import { MemoryPlaceScene } from '@/spatial/places/MemoryPlaceScene'
import { gateForMemoryPlace } from '@/spatial/places/memoryPlaceSafetyGate'
import { listMemoryPlaceObjects, resolveMemoryPlace } from '@/spatial/places/memoryPlaceRepository'

type MemoryPlacePageProps = {
  params: Promise<{
    placeId: string
  }>
}

export default async function MemoryPlacePage({ params }: MemoryPlacePageProps) {
  const { placeId } = await params
  const resolved = await resolveMemoryPlace(placeId)

  if (!resolved.ok) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white" data-place-route-authority="legacy-fail-closed-no-demo-substitution">
        <section className="max-w-xl rounded-3xl border border-white/10 bg-white/10 p-8 text-center backdrop-blur">
          <p className="text-xs uppercase tracking-[0.4em] text-cyan-100/70">Lived Place</p>
          <h1 className="mt-3 text-3xl font-semibold">Source-backed place required</h1>
          <p className="mt-3 text-sm text-slate-200">
            UrAi will not substitute a demo or symbolic room for a personal place. Continue in Ground, where authorized lived-world sources can be mounted truthfully.
          </p>
          <Link className="mt-6 inline-flex rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-950" href="/ground">
            Return to Ground
          </Link>
        </section>
      </main>
    )
  }

  const gate = gateForMemoryPlace(resolved.place)
  if (gate.required) return <MemoryPlaceGatePanel place={resolved.place} gate={gate} />

  return <MemoryPlaceScene place={resolved.place} objects={await listMemoryPlaceObjects(resolved.place.id)} />
}
