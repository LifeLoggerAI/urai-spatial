'use client'

import { Html, OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import dynamic from 'next/dynamic'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import SpatialFallbackPanel from './SpatialFallbackPanel'
import SpatialWorldStyles from './SpatialWorldStyles'
import { URAI_SPATIAL_DEMO_DATA, type SpatialMemory } from './spatialDemoData'

type SpatialWorldMode = 'spatial' | 'life-map' | 'home'

type SpatialWorldProps = {
  mode?: SpatialWorldMode
  embedded?: boolean
}

function useReducedMotionPreference() {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return reduced
}

function useWebGLAvailable() {
  const [available, setAvailable] = useState(true)

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
      setAvailable(Boolean(context))
    } catch {
      setAvailable(false)
    }
  }, [])

  return available
}

function SkyDome({ reducedMotion }: { reducedMotion: boolean }) {
  const ref = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!ref.current || reducedMotion) return
    ref.current.rotation.y = clock.elapsedTime * 0.01
  })

  return (
    <mesh ref={ref} scale={[-1, 1, 1]}>
      <sphereGeometry args={[42, 48, 48]} />
      <meshBasicMaterial side={THREE.BackSide} color="#08142f" />
    </mesh>
  )
}

function DreamTerrain({ reducedMotion }: { reducedMotion: boolean }) {
  const ref = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!ref.current || reducedMotion) return
    ref.current.position.y = -1.25 + Math.sin(clock.elapsedTime * 0.45) * 0.025
  })

  return (
    <group>
      <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.25, 0]} receiveShadow>
        <circleGeometry args={[15, 96]} />
        <meshStandardMaterial color="#081327" roughness={0.86} metalness={0.05} emissive="#0b2740" emissiveIntensity={0.28} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.18, 0]}>
        <ringGeometry args={[2.2, 9.8, 128]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={0.08} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function AvatarAnchor({ reducedMotion }: { reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return
    group.current.rotation.y = Math.sin(clock.elapsedTime * 0.35) * 0.06
  })

  return (
    <group ref={group} position={[0, -0.55, 0]} data-testid="avatar-anchor">
      <mesh castShadow position={[0, 0.95, 0]}>
        <capsuleGeometry args={[0.28, 1.3, 8, 20]} />
        <meshStandardMaterial color="#0b1028" emissive="#5eead4" emissiveIntensity={0.22} transparent opacity={0.72} />
      </mesh>
      <mesh position={[0, 1.82, 0]} castShadow>
        <sphereGeometry args={[0.25, 24, 24]} />
        <meshStandardMaterial color="#111827" emissive="#a78bfa" emissiveIntensity={0.24} transparent opacity={0.72} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <ringGeometry args={[0.55, 0.9, 64]} />
        <meshBasicMaterial color="#93c5fd" transparent opacity={0.18} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function AuraParticles({ reducedMotion }: { reducedMotion: boolean }) {
  const points = useRef<THREE.Points>(null)
  const geometry = useMemo(() => {
    const positions = new Float32Array(220 * 3)
    for (let i = 0; i < 220; i += 1) {
      const radius = 4 + (i % 37) * 0.19
      const angle = i * 2.399963
      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 1] = -0.4 + ((i * 17) % 90) / 18
      positions[i * 3 + 2] = Math.sin(angle) * radius
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return g
  }, [])

  useFrame(({ clock }) => {
    if (!points.current || reducedMotion) return
    points.current.rotation.y = clock.elapsedTime * 0.025
  })

  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial size={0.035} color="#bae6fd" transparent opacity={0.48} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  )
}

function MemoryStar({ memory, selected, onHover, onSelect }: { memory: SpatialMemory; selected: boolean; onHover: (memory: SpatialMemory | null) => void; onSelect: (memory: SpatialMemory) => void }) {
  const mesh = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)
  const color = useMemo(() => new THREE.Color(memory.colorToken), [memory.colorToken])

  useFrame(({ clock }) => {
    if (!mesh.current) return
    const pulse = 1 + Math.sin(clock.elapsedTime * 2.2 + memory.intensity * 4) * 0.08
    mesh.current.scale.setScalar((0.85 + memory.intensity * 0.8) * (hovered || selected ? 1.35 : pulse))
  })

  const enter = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    setHovered(true)
    onHover(memory)
  }

  const leave = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    setHovered(false)
    onHover(null)
  }

  const click = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    onSelect(memory)
  }

  return (
    <group position={memory.position as [number, number, number]}>
      <mesh ref={mesh} onPointerOver={enter} onPointerOut={leave} onClick={click} data-testid="memory-star">
        <sphereGeometry args={[0.12, 24, 24]} />
        <meshStandardMaterial color="#07111f" emissive={color} emissiveIntensity={hovered || selected ? 3.8 : 1.8} transparent opacity={0.96} />
      </mesh>
      <mesh scale={hovered || selected ? 1.55 : 1}>
        <sphereGeometry args={[0.34 + memory.intensity * 0.12, 24, 24]} />
        <meshBasicMaterial color={color} transparent opacity={hovered || selected ? 0.18 : 0.06} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {(hovered || selected) ? (
        <Html distanceFactor={8} position={[0.24, 0.2, 0]} center={false} className="memory-star-label">
          {memory.title}
        </Html>
      ) : null}
    </group>
  )
}

function MemoryConstellation({ memories, selectedMemory, onHover, onSelect }: { memories: readonly SpatialMemory[]; selectedMemory: SpatialMemory | null; onHover: (memory: SpatialMemory | null) => void; onSelect: (memory: SpatialMemory) => void }) {
  const lines = useMemo(() => {
    const byId = new Map(memories.map((memory) => [memory.id, memory]))
    const positions: number[] = []
    memories.forEach((memory) => {
      memory.relatedMemoryIds.forEach((relatedId) => {
        const related = byId.get(relatedId)
        if (!related || memory.id > related.id) return
        positions.push(...memory.position, ...related.position)
      })
    })
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    return geometry
  }, [memories])

  return (
    <group>
      <lineSegments geometry={lines} frustumCulled={false}>
        <lineBasicMaterial color="#8fdcff" transparent opacity={0.28} blending={THREE.AdditiveBlending} depthWrite={false} />
      </lineSegments>
      {memories.map((memory) => (
        <MemoryStar key={memory.id} memory={memory} selected={selectedMemory?.id === memory.id} onHover={onHover} onSelect={onSelect} />
      ))}
    </group>
  )
}

function OrbCompanion3D({ onGuide }: { onGuide: () => void }) {
  const ref = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.position.y = 1.25 + Math.sin(clock.elapsedTime * 1.1) * 0.08
    ref.current.rotation.y = clock.elapsedTime * 0.22
  })

  return (
    <group ref={ref} position={[0, 1.25, 1.65]} data-testid="orb-companion">
      <mesh onClick={(event) => { event.stopPropagation(); onGuide() }}>
        <sphereGeometry args={[0.34, 32, 32]} />
        <meshStandardMaterial color="#0b1028" emissive="#67e8f9" emissiveIntensity={2.6} roughness={0.18} metalness={0.12} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.7, 32, 32]} />
        <meshBasicMaterial color="#8b5cf6" transparent opacity={0.08} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <Html position={[0.55, 0.18, 0]} distanceFactor={7}>
        <button type="button" className="orb-companion-button" aria-label="Ask orb companion for guidance" onClick={onGuide}>Guide</button>
      </Html>
    </group>
  )
}

function ReplayCameraRig({ selectedMemory, reducedMotion }: { selectedMemory: SpatialMemory | null; reducedMotion: boolean }) {
  const target = useMemo(() => new THREE.Vector3(0, 0.7, 0), [])
  const position = useMemo(() => new THREE.Vector3(0, 2.7, 8), [])

  useFrame(({ camera, clock }, delta) => {
    const desiredTarget = selectedMemory ? new THREE.Vector3(...selectedMemory.position) : target
    const desiredPosition = selectedMemory
      ? new THREE.Vector3(selectedMemory.position[0] * 0.55, selectedMemory.position[1] + 0.9, selectedMemory.position[2] + 3.1)
      : position.clone().add(new THREE.Vector3(Math.sin(clock.elapsedTime * 0.18) * 0.18, Math.sin(clock.elapsedTime * 0.22) * 0.05, 0))
    const lerp = reducedMotion ? 0.2 : Math.min(0.12, delta * 1.8)
    camera.position.lerp(desiredPosition, lerp)
    camera.lookAt(desiredTarget)
  })

  return <group data-testid="replay-camera-rig" />
}

function SpatialScene({ mode, selectedMemory, onHover, onSelect, onGuide, reducedMotion }: { mode: SpatialWorldMode; selectedMemory: SpatialMemory | null; onHover: (memory: SpatialMemory | null) => void; onSelect: (memory: SpatialMemory) => void; onGuide: () => void; reducedMotion: boolean }) {
  const memories = URAI_SPATIAL_DEMO_DATA.memories

  return (
    <>
      <color attach="background" args={[mode === 'life-map' ? '#02030a' : '#071126']} />
      <fog attach="fog" args={['#08142f', 7, 24]} />
      <PerspectiveCamera makeDefault position={[0, 2.7, 8]} fov={48} />
      <ReplayCameraRig selectedMemory={selectedMemory} reducedMotion={reducedMotion} />
      <OrbitControls enablePan={false} enableDamping={!reducedMotion} dampingFactor={0.05} rotateSpeed={0.42} minDistance={4.2} maxDistance={11} minPolarAngle={0.82} maxPolarAngle={1.72} />
      <ambientLight intensity={0.62} color="#c7ddff" />
      <hemisphereLight args={['#dbeafe', '#09051f', 1.2]} />
      <directionalLight position={[-4, 7, 4]} intensity={1.8} color="#dbeafe" castShadow />
      <pointLight position={[0, 2.2, 1.6]} intensity={2.8} color="#67e8f9" distance={8} />
      <pointLight position={[-4, 3, -4]} intensity={1.2} color="#a78bfa" distance={12} />
      <SkyDome reducedMotion={reducedMotion} />
      <DreamTerrain reducedMotion={reducedMotion} />
      <AvatarAnchor reducedMotion={reducedMotion} />
      <MemoryConstellation memories={memories} selectedMemory={selectedMemory} onHover={onHover} onSelect={onSelect} />
      <OrbCompanion3D onGuide={onGuide} />
      <AuraParticles reducedMotion={reducedMotion} />
      <EffectComposer enabled={!reducedMotion}>
        <Bloom intensity={0.75} luminanceThreshold={0.12} luminanceSmoothing={0.28} />
        <Vignette eskil={false} offset={0.18} darkness={0.62} />
      </EffectComposer>
    </>
  )
}

function SpatialHUD({ mode, selectedMemory, hoveredMemory, companionMessage, onClose, onGuide }: { mode: SpatialWorldMode; selectedMemory: SpatialMemory | null; hoveredMemory: SpatialMemory | null; companionMessage: string; onClose: () => void; onGuide: () => void }) {
  const active = selectedMemory ?? hoveredMemory

  return (
    <div className="spatial-hud">
      <section className="spatial-hud__top" aria-label="URAI Spatial world header">
        <p className="spatial-hud__eyebrow">URAI Spatial · Local Demo Data</p>
        <h1>{mode === 'life-map' ? 'Memory starfield timeline' : 'Cinematic spatial world'}</h1>
        <p>Explore a symbolic 3D memory constellation. This view uses deterministic local demo data and is ready for Firebase-backed memories later.</p>
        <span className="spatial-hud__pill">Drag to orbit · click stars · ESC unwinds</span>
      </section>

      <section className="spatial-hud__companion" aria-live="polite">
        {companionMessage}
      </section>

      {active ? (
        <section className="spatial-hud__detail" data-testid="life-map-detail-panel" aria-label="Selected memory detail">
          <p className="spatial-hud__eyebrow">{selectedMemory ? 'Focused memory' : 'Memory preview'}</p>
          <h2>{active.title}</h2>
          <p>{active.replayText}</p>
          <div className="spatial-hud__meta">
            <span>{active.emotion}</span>
            <span>{active.archetype}</span>
            <span>{active.season}</span>
            <span>{Math.round(active.intensity * 100)} intensity</span>
          </div>
          {selectedMemory ? (
            <div className="spatial-hud__actions">
              <button type="button" className="primary" onClick={onGuide}>Ask companion</button>
              <button type="button" onClick={onClose}>Unwind focus</button>
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="spatial-truth-strip">Local demo data only · no live AR/VR/biometric/wearable/Firebase memory grounding active</div>
    </div>
  )
}

function SpatialWorldCanvasImpl({ mode = 'spatial', embedded = false }: SpatialWorldProps) {
  const reducedMotion = useReducedMotionPreference()
  const webglAvailable = useWebGLAvailable()
  const [selectedMemory, setSelectedMemory] = useState<SpatialMemory | null>(null)
  const [hoveredMemory, setHoveredMemory] = useState<SpatialMemory | null>(null)
  const [companionMessage, setCompanionMessage] = useState('The orb is ready. Choose a star, or drag the world gently to look around.')

  const closeFocus = useCallback(() => setSelectedMemory(null), [])
  const guide = useCallback(() => {
    setCompanionMessage(selectedMemory ? `Companion note: ${selectedMemory.title} is part of the ${selectedMemory.season} arc.` : 'Companion note: begin with the brightest star, then follow its connected arc.')
  }, [selectedMemory])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeFocus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeFocus])

  return (
    <main className="spatial-world-root" data-mode={mode} data-embed={embedded ? 'true' : 'false'}>
      <SpatialWorldStyles />
      {!webglAvailable ? (
        <SpatialFallbackPanel reason="WebGL is unavailable, so URAI is showing the deterministic fallback panel." />
      ) : (
        <Suspense fallback={<div className="spatial-world-loading"><SpatialFallbackPanel reason="Loading the local 3D memory world." /></div>}>
          <Canvas data-testid="spatial-world-canvas" shadows dpr={[1, 1.7]} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }} onCreated={({ gl }) => { gl.setPixelRatio(Math.min(window.devicePixelRatio, 1.7)) }}>
            <SpatialScene mode={mode} selectedMemory={selectedMemory} onHover={setHoveredMemory} onSelect={setSelectedMemory} onGuide={guide} reducedMotion={reducedMotion} />
          </Canvas>
        </Suspense>
      )}
      <SpatialHUD mode={mode} selectedMemory={selectedMemory} hoveredMemory={hoveredMemory} companionMessage={companionMessage} onClose={closeFocus} onGuide={guide} />
    </main>
  )
}

export const SpatialWorldCanvas = dynamic(() => Promise.resolve(SpatialWorldCanvasImpl), {
  ssr: false,
  loading: () => <SpatialFallbackPanel reason="Preparing the client-only spatial world." />,
})

export default SpatialWorldCanvas
export { SpatialScene, MemoryConstellation, MemoryStar, OrbCompanion3D, DreamTerrain, SkyDome, AvatarAnchor, ReplayCameraRig, SpatialFallbackPanel, SpatialHUD }
