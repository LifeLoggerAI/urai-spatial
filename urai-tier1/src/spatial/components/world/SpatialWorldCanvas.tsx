'use client'

import { Html, OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import dynamic from 'next/dynamic'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import SpatialWorldAssetLayer from '../../scene/SpatialWorldAssetLayer'
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

function spatialAssetPhaseForMode(mode: SpatialWorldMode, selectedMemory: SpatialMemory | null) {
  if (selectedMemory) return 'FOCUS'
  if (mode === 'home') return 'HOME'
  return 'LIFEMAP'
}

function SkyDome({ reducedMotion, mode }: { reducedMotion: boolean; mode: SpatialWorldMode }) {
  const ref = useRef<THREE.Mesh>(null)
  const isLifeMap = mode === 'life-map' || mode === 'spatial'

  useFrame(({ clock }) => {
    if (!ref.current || reducedMotion) return
    ref.current.rotation.y = clock.elapsedTime * (isLifeMap ? 0.018 : 0.01)
  })

  return (
    <mesh ref={ref} scale={[-1, 1, 1]}>
      <sphereGeometry args={[44, 64, 64]} />
      <meshBasicMaterial side={THREE.BackSide} color={isLifeMap ? '#02040d' : '#061225'} />
    </mesh>
  )
}

function DreamTerrain({ reducedMotion, mode }: { reducedMotion: boolean; mode: SpatialWorldMode }) {
  const ref = useRef<THREE.Mesh>(null)
  const isHome = mode === 'home'

  useFrame(({ clock }) => {
    if (!ref.current || reducedMotion) return
    ref.current.position.y = -1.25 + Math.sin(clock.elapsedTime * 0.45) * 0.025
  })

  return (
    <group name="home-ground-visibility-fallback">
      <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.25, 0]} receiveShadow>
        <circleGeometry args={[16, 128]} />
        <meshStandardMaterial color="#071427" roughness={0.82} metalness={0.08} emissive="#0b2a3f" emissiveIntensity={isHome ? 0.42 : 0.28} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.17, 0]}>
        <ringGeometry args={[2.1, 10.2, 160]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={isHome ? 0.12 : 0.07} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.35, -5.35]}>
        <ringGeometry args={[1.45, 3.05, 128]} />
        <meshBasicMaterial color="#a78bfa" transparent opacity={isHome ? 0.2 : 0.11} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
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
      <mesh castShadow position={[0, 0.9, 0]}>
        <capsuleGeometry args={[0.3, 1.38, 10, 28]} />
        <meshStandardMaterial color="#081225" emissive="#5eead4" emissiveIntensity={0.24} transparent opacity={0.74} />
      </mesh>
      <mesh position={[0, 1.82, 0]} castShadow>
        <sphereGeometry args={[0.27, 32, 32]} />
        <meshStandardMaterial color="#0b1224" emissive="#a78bfa" emissiveIntensity={0.28} transparent opacity={0.76} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[0.56, 0.94, 96]} />
        <meshBasicMaterial color="#93c5fd" transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function AuraParticles({ reducedMotion, mode }: { reducedMotion: boolean; mode: SpatialWorldMode }) {
  const points = useRef<THREE.Points>(null)
  const isLifeMap = mode === 'life-map' || mode === 'spatial'
  const geometry = useMemo(() => {
    const positions = new Float32Array(420 * 3)
    for (let i = 0; i < 420; i += 1) {
      const radius = (isLifeMap ? 3.4 : 2.4) + (i % 61) * (isLifeMap ? 0.14 : 0.08)
      const angle = i * 2.399963
      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 1] = (isLifeMap ? -0.55 : 0.4) + ((i * 17) % 110) / (isLifeMap ? 19 : 24)
      positions[i * 3 + 2] = Math.sin(angle) * radius - (isLifeMap ? 0 : 2.1)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return g
  }, [isLifeMap])

  useFrame(({ clock }) => {
    if (!points.current || reducedMotion) return
    points.current.rotation.y = clock.elapsedTime * (isLifeMap ? 0.023 : 0.016)
  })

  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial size={isLifeMap ? 0.03 : 0.022} color="#bae6fd" transparent opacity={isLifeMap ? 0.42 : 0.28} depthWrite={false} blending={THREE.AdditiveBlending} />
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
    mesh.current.scale.setScalar((0.78 + memory.intensity * 0.58) * (hovered || selected ? 1.55 : pulse))
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
        <sphereGeometry args={[0.1, 24, 24]} />
        <meshStandardMaterial color="#07111f" emissive={color} emissiveIntensity={hovered || selected ? 4.2 : 1.75} transparent opacity={0.96} />
      </mesh>
      <mesh scale={hovered || selected ? 1.65 : 1}>
        <sphereGeometry args={[0.28 + memory.intensity * 0.12, 24, 24]} />
        <meshBasicMaterial color={color} transparent opacity={hovered || selected ? 0.2 : 0.055} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {(hovered || selected) ? (
        <Html distanceFactor={8} position={[0.22, 0.18, 0]} center={false} className="memory-star-label">
          {memory.title}
        </Html>
      ) : null}
    </group>
  )
}

function MemoryConstellation({ memories, selectedMemory, onHover, onSelect, visible }: { memories: readonly SpatialMemory[]; selectedMemory: SpatialMemory | null; onHover: (memory: SpatialMemory | null) => void; onSelect: (memory: SpatialMemory) => void; visible: boolean }) {
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
    <group visible={visible} position={visible ? [0, 0, 0] : [0, 5.8, -8.2]}>
      <lineSegments geometry={lines} frustumCulled={false}>
        <lineBasicMaterial color="#8fdcff" transparent opacity={0.24} blending={THREE.AdditiveBlending} depthWrite={false} />
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
    ref.current.position.y = 1.32 + Math.sin(clock.elapsedTime * 1.1) * 0.075
    ref.current.rotation.y = clock.elapsedTime * 0.18
  })

  return (
    <group ref={ref} position={[0, 1.32, 1.92]} data-testid="orb-companion">
      <mesh onClick={(event) => { event.stopPropagation(); onGuide() }}>
        <sphereGeometry args={[0.28, 40, 40]} />
        <meshStandardMaterial color="#091124" emissive="#67e8f9" emissiveIntensity={3.1} roughness={0.16} metalness={0.14} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.66, 36, 36]} />
        <meshBasicMaterial color="#8b5cf6" transparent opacity={0.07} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <Html position={[0.48, 0.14, 0]} distanceFactor={7}>
        <button type="button" className="orb-companion-button" aria-label="Ask orb companion for guidance" onClick={onGuide}>Orb</button>
      </Html>
    </group>
  )
}

function ReplayCameraRig({ selectedMemory, reducedMotion }: { selectedMemory: SpatialMemory | null; reducedMotion: boolean }) {
  useFrame(({ camera }, delta) => {
    if (!selectedMemory) return
    const desiredTarget = new THREE.Vector3(...selectedMemory.position)
    const desiredPosition = new THREE.Vector3(selectedMemory.position[0] * 0.5, selectedMemory.position[1] + 0.85, selectedMemory.position[2] + 3.0)
    const lerp = reducedMotion ? 0.2 : Math.min(0.14, delta * 1.9)
    camera.position.lerp(desiredPosition, lerp)
    camera.lookAt(desiredTarget)
  })

  return <group data-testid="replay-camera-rig" />
}

function SpatialScene({ mode, selectedMemory, onHover, onSelect, onGuide, reducedMotion }: { mode: SpatialWorldMode; selectedMemory: SpatialMemory | null; onHover: (memory: SpatialMemory | null) => void; onSelect: (memory: SpatialMemory) => void; onGuide: () => void; reducedMotion: boolean }) {
  const memories = URAI_SPATIAL_DEMO_DATA.memories
  const isLifeMap = mode === 'life-map' || mode === 'spatial'

  return (
    <>
      <color attach="background" args={[isLifeMap ? '#02030a' : '#061126']} />
      <fog attach="fog" args={['#08142f', isLifeMap ? 8 : 7, isLifeMap ? 26 : 30]} />
      <PerspectiveCamera makeDefault position={isLifeMap ? [0, 2.6, 9.2] : [0, 2.35, 8.4]} fov={isLifeMap ? 50 : 43} />
      <ReplayCameraRig selectedMemory={selectedMemory} reducedMotion={reducedMotion} />
      <OrbitControls enablePan={false} enableZoom zoomSpeed={0.62} enableDamping={!reducedMotion} dampingFactor={0.065} rotateSpeed={0.36} minDistance={3.2} maxDistance={14} minPolarAngle={0.68} maxPolarAngle={1.82} />
      <ambientLight intensity={0.58} color="#c7ddff" />
      <hemisphereLight args={['#dbeafe', '#09051f', 1.2]} />
      <directionalLight position={[-4, 7, 4]} intensity={1.8} color="#dbeafe" castShadow />
      <pointLight position={[0, 2.25, 1.8]} intensity={3.1} color="#67e8f9" distance={8} />
      <pointLight position={[-4, 3, -4]} intensity={1.2} color="#a78bfa" distance={12} />
      <SkyDome reducedMotion={reducedMotion} mode={mode} />
      <SpatialWorldAssetLayer phase={spatialAssetPhaseForMode(mode, selectedMemory)} />
      <DreamTerrain reducedMotion={reducedMotion} mode={mode} />
      <AvatarAnchor reducedMotion={reducedMotion} />
      <MemoryConstellation memories={memories} selectedMemory={selectedMemory} onHover={onHover} onSelect={onSelect} visible={isLifeMap || Boolean(selectedMemory)} />
      <OrbCompanion3D onGuide={onGuide} />
      <AuraParticles reducedMotion={reducedMotion} mode={mode} />
      <EffectComposer enabled={!reducedMotion}>
        <Bloom intensity={0.82} luminanceThreshold={0.12} luminanceSmoothing={0.28} />
        <Vignette eskil={false} offset={0.18} darkness={0.62} />
      </EffectComposer>
    </>
  )
}

function SpatialHUD({ mode, selectedMemory, hoveredMemory, companionMessage, onClose, onGuide, onOpenLifeMap, onReturnHome }: { mode: SpatialWorldMode; selectedMemory: SpatialMemory | null; hoveredMemory: SpatialMemory | null; companionMessage: string; onClose: () => void; onGuide: () => void; onOpenLifeMap: () => void; onReturnHome: () => void }) {
  const active = selectedMemory ?? hoveredMemory
  const isLifeMap = mode === 'life-map' || mode === 'spatial'

  return (
    <div className="spatial-hud" data-world-ui={isLifeMap ? 'life-map' : 'home'}>
      <section className="spatial-hud__top" aria-label="URAI Spatial world header">
        <p className="spatial-hud__eyebrow">URAI Spatial Home</p>
        <h1>{isLifeMap ? 'Life Map sky layer' : 'URAI world hub'}</h1>
        <p>{isLifeMap ? 'The Home chamber remains below while the memory sky opens above it. Choose a star to enter Focus.' : 'A continuous spatial chamber with Ground below, Life Map above, and the orb at the center.'}</p>
        <span className="spatial-hud__pill">Home · Ground · Life Map</span>
        <div className="spatial-hud__actions spatial-hud__actions--nav">
          {isLifeMap ? <button type="button" onClick={onReturnHome}>Return to Home</button> : <button type="button" className="primary" onClick={onOpenLifeMap}>Ascend to Life Map</button>}
          <button type="button" onClick={onGuide}>Ask Orb</button>
        </div>
      </section>

      <section className="spatial-hud__companion" aria-live="polite">
        {companionMessage}
      </section>

      {active ? (
        <section className="spatial-hud__detail" data-testid="life-map-detail-panel" aria-label="Selected memory detail">
          <p className="spatial-hud__eyebrow">{selectedMemory ? 'Focus entry' : 'Star preview'}</p>
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
              <button type="button" className="primary" onClick={onGuide}>Ask Orb</button>
              <button type="button" onClick={onClose}>Return to star field</button>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}

function SpatialWorldCanvasImpl({ mode = 'home', embedded = false }: SpatialWorldProps) {
  const reducedMotion = useReducedMotionPreference()
  const webglAvailable = useWebGLAvailable()
  const [worldMode, setWorldMode] = useState<SpatialWorldMode>(mode)
  const [selectedMemory, setSelectedMemory] = useState<SpatialMemory | null>(null)
  const [hoveredMemory, setHoveredMemory] = useState<SpatialMemory | null>(null)
  const [companionMessage, setCompanionMessage] = useState('URAI Spatial Home is online. Ground is below; the Life Map sky is above.')

  const closeFocus = useCallback(() => setSelectedMemory(null), [])
  const openLifeMap = useCallback(() => {
    setWorldMode('life-map')
    setCompanionMessage('Life Map opened above Home. Choose a star to enter Focus from inside the same world.')
  }, [])
  const returnHome = useCallback(() => {
    setSelectedMemory(null)
    setHoveredMemory(null)
    setWorldMode('home')
    setCompanionMessage('Returned to Home. Ground remains reachable below the chamber.')
  }, [])
  const guide = useCallback(() => {
    setCompanionMessage(selectedMemory ? `Orb note: ${selectedMemory.title} is ready for Focus and Replay.` : 'Orb note: this is the Home hub. Ascend to the Life Map, or descend toward Ground.')
  }, [selectedMemory])

  useEffect(() => setWorldMode(mode), [mode])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeFocus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeFocus])

  return (
    <main className="spatial-world-root" data-mode={worldMode} data-embed={embedded ? 'true' : 'false'}>
      <SpatialWorldStyles />
      {!webglAvailable ? (
        <SpatialFallbackPanel reason="WebGL is unavailable, so URAI is showing the spatial fallback panel." />
      ) : (
        <Suspense fallback={<div className="spatial-world-loading"><SpatialFallbackPanel reason="Loading URAI Spatial Home." /></div>}>
          <Canvas data-testid="spatial-world-canvas" shadows dpr={[1, 1.7]} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }} onCreated={({ gl }) => { gl.setPixelRatio(Math.min(window.devicePixelRatio, 1.7)) }}>
            <SpatialScene mode={worldMode} selectedMemory={selectedMemory} onHover={setHoveredMemory} onSelect={setSelectedMemory} onGuide={guide} reducedMotion={reducedMotion} />
          </Canvas>
        </Suspense>
      )}
      <SpatialHUD mode={worldMode} selectedMemory={selectedMemory} hoveredMemory={hoveredMemory} companionMessage={companionMessage} onClose={closeFocus} onGuide={guide} onOpenLifeMap={openLifeMap} onReturnHome={returnHome} />
    </main>
  )
}

export const SpatialWorldCanvas = dynamic(() => Promise.resolve(SpatialWorldCanvasImpl), {
  ssr: false,
  loading: () => <SpatialFallbackPanel reason="Preparing URAI Spatial Home." />,
})

export default SpatialWorldCanvas
export { SpatialScene, MemoryConstellation, MemoryStar, OrbCompanion3D, DreamTerrain, SkyDome, AvatarAnchor, ReplayCameraRig, SpatialFallbackPanel, SpatialHUD }
