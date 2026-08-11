'use client'

import Link from 'next/link'
import { useState } from 'react'
import RealWorldModel, { REAL_WORLD_MODEL_PATHS } from '@/spatial/assets/RealWorldModel'
import PhysicalRealmStage from '@/spatial/assets/PhysicalRealmStage'

const COUNCIL_PEOPLE = [
  { id: 'guide', label: 'Guide', src: REAL_WORLD_MODEL_PATHS.councilGuide, position: [-2.8, 0.05, -1.0] as [number, number, number], rotation: [0, 0.72, 0] as [number, number, number] },
  { id: 'mirror', label: 'Mirror', src: REAL_WORLD_MODEL_PATHS.councilMirror, position: [-1.55, 0.05, -2.7] as [number, number, number], rotation: [0, 0.35, 0] as [number, number, number] },
  { id: 'guardian', label: 'Guardian', src: REAL_WORLD_MODEL_PATHS.councilGuardian, position: [0, 0.05, -3.25] as [number, number, number], rotation: [0, 0, 0] as [number, number, number] },
  { id: 'archivist', label: 'Archivist', src: REAL_WORLD_MODEL_PATHS.councilArchivist, position: [1.55, 0.05, -2.7] as [number, number, number], rotation: [0, -0.35, 0] as [number, number, number] },
  { id: 'builder', label: 'Builder', src: REAL_WORLD_MODEL_PATHS.councilBuilder, position: [2.8, 0.05, -1.0] as [number, number, number], rotation: [0, -0.72, 0] as [number, number, number] },
  { id: 'trickster', label: 'Trickster', src: REAL_WORLD_MODEL_PATHS.councilTrickster, position: [3.35, 0.05, 1.0] as [number, number, number], rotation: [0, -1.2, 0] as [number, number, number] },
] as const

function CouncilPeople({ selected }: { selected: string }) {
  return (
    <>
      {COUNCIL_PEOPLE.map((person) => (
        <group key={person.id}>
          <RealWorldModel
            src={person.src}
            name={`council-${person.id}-human-glb`}
            position={person.position}
            rotation={person.rotation}
            scale={selected === person.id ? 1.015 : 1}
          />
          {selected === person.id ? (
            <mesh position={[person.position[0], 0.025, person.position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.28, 0.34, 48]} />
              <meshBasicMaterial color="#d9edf6" transparent opacity={0.22} depthWrite={false} />
            </mesh>
          ) : null}
        </group>
      ))}
    </>
  )
}

export default function CouncilRealWorldRealm() {
  const [selected, setSelected] = useState('guide')
  const selectedPerson = COUNCIL_PEOPLE.find((person) => person.id === selected) ?? COUNCIL_PEOPLE[0]

  const overlay = (
    <section
      aria-label="Council controls"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 'clamp(18px, 4vw, 44px)',
        color: '#f7f4ee',
        fontFamily: 'Inter, ui-sans-serif, system-ui',
      }}
    >
      <div style={{ pointerEvents: 'auto', width: 'min(470px, 92vw)', padding: 16, borderRadius: 18, background: 'rgba(18,20,21,.56)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,.12)' }}>
        <p style={{ margin: 0, fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', opacity: .62 }}>URAI Council · real-world GLB</p>
        <h1 style={{ margin: '7px 0 0', fontSize: 'clamp(28px, 4vw, 46px)', letterSpacing: '-.035em' }}>{selectedPerson.label}</h1>
        <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.5, opacity: .76 }}>Six independent human models inside a physical chamber. Select a Council presence; role behavior remains governed by the Council runtime.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 13 }}>
          {COUNCIL_PEOPLE.map((person) => (
            <button
              key={person.id}
              type="button"
              onClick={() => setSelected(person.id)}
              aria-pressed={selected === person.id}
              style={{ border: '1px solid rgba(255,255,255,.16)', borderRadius: 999, padding: '8px 11px', background: selected === person.id ? 'rgba(255,255,255,.18)' : 'rgba(0,0,0,.18)', color: '#fff', cursor: 'pointer' }}
            >
              {person.label}
            </button>
          ))}
        </div>
      </div>

      <nav style={{ pointerEvents: 'auto', display: 'flex', flexWrap: 'wrap', gap: 9, alignSelf: 'flex-end' }} aria-label="Council destinations">
        <Link href="/passport?from=council" style={{ color: '#fff', textDecoration: 'none', padding: '10px 14px', borderRadius: 999, background: 'rgba(18,20,21,.58)', border: '1px solid rgba(255,255,255,.14)' }}>Passport</Link>
        <Link href="/mirror?from=council" style={{ color: '#fff', textDecoration: 'none', padding: '10px 14px', borderRadius: 999, background: 'rgba(18,20,21,.58)', border: '1px solid rgba(255,255,255,.14)' }}>Mirror</Link>
        <Link href="/home?returnFrom=council" style={{ color: '#fff', textDecoration: 'none', padding: '10px 14px', borderRadius: 999, background: 'rgba(18,20,21,.58)', border: '1px solid rgba(255,255,255,.14)' }}>Home</Link>
      </nav>
    </section>
  )

  return (
    <PhysicalRealmStage
      modelSrc={REAL_WORLD_MODEL_PATHS.councilChamber}
      ariaLabel="URAI Council Chamber"
      background="#7f8989"
      fog="#929a98"
      cameraPosition={[0, 1.68, 7.5]}
      target={[0, 1.2, -0.8]}
      environmentPreset="apartment"
      overlay={overlay}
      testId="urai-council-real-world-stage"
    >
      <CouncilPeople selected={selected} />
    </PhysicalRealmStage>
  )
}
