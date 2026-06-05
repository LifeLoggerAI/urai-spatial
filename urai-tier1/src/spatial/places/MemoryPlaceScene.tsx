"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { MemoryPlace } from './memoryPlaceSchema';
import { PlaceObject } from './placeObjectSchema';

function PlaceObjectMesh({ object, selected, onSelect }: { object: PlaceObject; selected: boolean; onSelect: (object: PlaceObject) => void }) {
  const scale = Math.max(0.2, object.scale) * (selected ? 1.16 : 1);
  const isPortal = object.objectType === 'threshold' || object.objectType === 'portal';

  return (
    <group position={object.position} rotation={object.rotation ?? [0, 0, 0]}>
      {isPortal ? (
        <mesh scale={[scale * 0.9, scale * 1.45, 0.08]} onClick={(event) => { event.stopPropagation(); onSelect(object); }}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial emissive={selected ? '#f0abfc' : '#7dd3fc'} color="#1f2937" metalness={0.2} roughness={0.45} />
        </mesh>
      ) : (
        <mesh scale={[scale, scale, scale]} onClick={(event) => { event.stopPropagation(); onSelect(object); }}>
          <sphereGeometry args={[0.38, 32, 32]} />
          <meshStandardMaterial emissive={selected ? '#f0abfc' : '#a78bfa'} color="#f8fafc" metalness={0.1} roughness={0.35} />
        </mesh>
      )}
    </group>
  );
}

function PlaceWorld({ place, objects, selectedObjectId, onSelectObject }: { place: MemoryPlace; objects: PlaceObject[]; selectedObjectId?: string; onSelectObject: (object: PlaceObject) => void }) {
  const fog = Math.max(0.01, place.emotionalOverlay.fogLevel);
  const bloom = Math.max(0.1, place.emotionalOverlay.bloomLevel);

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 2.3, 6]} fov={45} />
      <OrbitControls enablePan={false} maxPolarAngle={Math.PI / 2.05} minDistance={3} maxDistance={9} />
      <fog attach="fog" args={[place.emotionalOverlay.auraColor, 7, 18 + bloom * 8]} />
      <ambientLight intensity={0.65 + bloom * 0.25} />
      <pointLight position={[0, 4, 3]} intensity={1.1 + bloom} color={place.emotionalOverlay.auraColor} />
      <mesh position={[0, -0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[7.5, 96]} />
        <meshStandardMaterial color="#0f172a" emissive="#111827" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.35, -4.2]}>
        <torusGeometry args={[1.2, 0.035 + fog * 0.05, 24, 96]} />
        <meshStandardMaterial color="#e0f2fe" emissive={place.emotionalOverlay.auraColor} />
      </mesh>
      {objects.map((object) => (
        <PlaceObjectMesh key={object.id} object={object} selected={object.id === selectedObjectId} onSelect={onSelectObject} />
      ))}
    </>
  );
}

export function MemoryPlaceScene({ place, objects }: { place: MemoryPlace; objects: PlaceObject[] }) {
  const [selectedObjectId, setSelectedObjectId] = useState(objects[0]?.id);
  const selectedObject = useMemo(
    () => objects.find((object) => object.id === selectedObjectId) ?? objects[0],
    [objects, selectedObjectId],
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative h-screen overflow-hidden">
        <Canvas className="absolute inset-0">
          <PlaceWorld place={place} objects={objects} selectedObjectId={selectedObject?.id} onSelectObject={(object) => setSelectedObjectId(object.id)} />
        </Canvas>
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-slate-950/85 to-transparent p-6">
          <p className="text-xs uppercase tracking-[0.45em] text-cyan-100/70">Memory Place</p>
          <h1 className="mt-2 text-3xl font-semibold text-white md:text-5xl">{place.title}</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-200 md:text-base">
            A symbolic place linked to {place.memoryIds.length} memory marker{place.memoryIds.length === 1 ? '' : 's'}.
            Location precision: {place.locationPrivacy}.
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 z-10 flex flex-col gap-3 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent p-6 md:flex-row md:items-end md:justify-between">
          <div className="grid gap-3 rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur md:grid-cols-[1fr_1.1fr]">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-300">Objects</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {objects.map((object) => (
                  <button
                    key={object.id}
                    type="button"
                    onClick={() => setSelectedObjectId(object.id)}
                    className={`rounded-full border px-3 py-1 text-xs text-slate-100 ${object.id === selectedObject?.id ? 'border-cyan-200 bg-cyan-200/15' : 'border-white/15 bg-transparent'}`}
                  >
                    {object.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-3">
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-100/70">Selected</p>
              <h2 className="mt-2 text-lg font-semibold">{selectedObject?.label ?? 'No object selected'}</h2>
              <p className="mt-2 text-sm text-slate-300">
                {selectedObject ? `${selectedObject.objectType} · ${selectedObject.interactionType} · ${selectedObject.privacyLevel}` : 'Choose an object to inspect this place.'}
              </p>
              {selectedObject?.emotionalMeaning ? <p className="mt-2 text-sm text-slate-400">{selectedObject.emotionalMeaning}</p> : null}
            </div>
          </div>
          <div className="flex gap-3">
            <Link className="rounded-full border border-white/20 px-4 py-2 text-sm text-white backdrop-blur hover:bg-white/10" href="/location-map">
              Location Map
            </Link>
            <Link className="rounded-full border border-white/20 px-4 py-2 text-sm text-white backdrop-blur hover:bg-white/10" href="/life-map">
              Back to LifeMap
            </Link>
            <Link className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-100" href="/">
              Return Home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
