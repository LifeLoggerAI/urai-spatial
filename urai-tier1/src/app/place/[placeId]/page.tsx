import Link from 'next/link';
import { MemoryPlaceGatePanel } from '@/spatial/places/MemoryPlaceGatePanel';
import { MemoryPlaceScene } from '@/spatial/places/MemoryPlaceScene';
import { gateForMemoryPlace } from '@/spatial/places/memoryPlaceSafetyGate';
import { DEMO_MEMORY_PLACES } from '@/spatial/places/demoMemoryPlaces';
import { listMemoryPlaceObjects, resolveMemoryPlace } from '@/spatial/places/memoryPlaceRepository';


export function generateStaticParams() {
  return DEMO_MEMORY_PLACES.map((place) => ({
    placeId: place.id,
  }));
}
type MemoryPlacePageProps = {
  params: Promise<{
    placeId: string;
  }>;
};

export default async function MemoryPlacePage({ params }: MemoryPlacePageProps) {
  const { placeId } = await params;
  const resolved = await resolveMemoryPlace(placeId);

  if (!resolved.ok) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <section className="max-w-xl rounded-3xl border border-white/10 bg-white/10 p-8 text-center backdrop-blur">
          <p className="text-xs uppercase tracking-[0.4em] text-cyan-100/70">Memory Place</p>
          <h1 className="mt-3 text-3xl font-semibold">Place unavailable</h1>
          <p className="mt-3 text-sm text-slate-200">
            This place could not be opened safely. Return to the LifeMap and choose another memory door.
          </p>
          <Link className="mt-6 inline-flex rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-950" href="/life-map">
            Back to LifeMap
          </Link>
        </section>
      </main>
    );
  }

  const gate = gateForMemoryPlace(resolved.place);
  if (gate.required) return <MemoryPlaceGatePanel place={resolved.place} gate={gate} />;

  return <MemoryPlaceScene place={resolved.place} objects={await listMemoryPlaceObjects(resolved.place.id)} />;
}
