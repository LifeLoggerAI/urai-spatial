'use client'

import { Html, OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import dynamic from 'next/dynamic'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import SpatialWorldAssetLayer from '../../scene/SpatialWorldAssetLayer'
import { useAdaptiveSpatialQuality } from '../../performance/useAdaptiveSpatialQuality'
import SpatialFallbackPanel from './SpatialFallbackPanel'
import SpatialWorldStyles from './SpatialWorldStyles'
import { URAI_SPATIAL_DEMO_DATA, type SpatialMemory } from './spatialDemoData'

type SpatialWorldMode = 'spatial' | 'life-map' | 'home'

type SpatialWorldProps = {
  mode?: SpatialWorldMode
  embedded?: boolean
}

type SpatialSceneProps = {
  mode: SpatialWorldMode
  selectedMemory: SpatialMemory | null
  onHover: (memory: SpatialMemory | null) => void
  onSelect: (memory: SpatialMemory) => void
  onGuide: () => void
  reducedMotion: boolean
  particleCount: number
  shadows: boolean
  postprocessing: boolean
}

function useWebGLAvailable() {
  const [available, setAvailable] = useState(true)

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas')
      setAvailable(Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl')))
    } catch {
      setAvailable(false)
    }
  }, [])

  return available
}

function spatialAssetPhaseForMode(mode: SpatialWorldMode) {
  return mode === 'home' ? 'HOME' : 'LIFEMAP'
}

function SkyDome({ reducedMotion }: { reducedMotion: boolean }) {
  const ref = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!ref.current || reducedMotion) return
    ref.current.rotation.y = clock.elapsedTime * 0.012
  })

  return (
    <mesh ref={ref} scale={[-1, 1, 1]}>
      <sphereGeometry args={[44, 48, 48]} />
      <meshBasicMaterial side={THREE.BackSide} color="#071329" />
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
        <circleGeometry args={[16, 96]} />
        <meshStandardMaterial color="#071427" roughness={0.82} metalness={0.08} emissive="#0b2a3f" emissiveIntensity={0.34} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.17, 0]}>
        <ringGeometry args={[2.1, 10.2, 128]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={0.09} side={THREE.DoubleSide} />
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
        <capsuleGeometry args={[0.3, 1.38, 10, 24]} />
        <meshStandardMaterial color="#081225" emissive="#5eead4" emissiveIntensity={0.24} transparent opacity={0.74} />
      </mesh>
      <mesh position={[0, 1.82, 0]} castShadow>
        <sphereGeometry args={[0.27, 24, 24]} />
        <meshStandardMaterial color="#0b1224" emissive="#a78bfa" emissiveIntensity={0.28} transparent opacity={0.76} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[0.56, 0.94, 72]} />
        <meshBasicMaterial color="#93c5fd" transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function AuraParticles({ reducedMotion, particleCount }: { reducedMotion: boolean; particleCount: number }) {
  const points = useRef<THREE.Points>(null)
  const geometry = useMemo(() => {
    const positions = new Float32Array(particleCount * 3)
    for (let index = 0; index < particleCount; index += 1) {
      const radius = 3.4 + (index % 61) * 0.14
      const angle = index * 2.399963
      positions[index * 3] = Math.cos(angle) * radius
      positions[index * 3 + 1] = -0.55 + ((index * 17) % 110) / 19
      positions[index * 3 + 2] = Math.sin(angle) * radius
    }
    const value = new THREE.BufferGeometry()
    value.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return value
  }, [particleCount])

  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame(({ clock }) => {
    if (!points.current || reducedMotion) return
    points.current.rotation.y = clock.elapsedTime * 0.023
  })

  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial size={0.03} color="#bae6fd" transparent opacity={0.42} depthWrite={false} blending={THREE.AdditiveBlending} />
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
        <sphereGeometry args={[0.1, 20, 20]} />
        <meshStandardMaterial color="#07111f" emissive={color} emissiveIntensity={hovered || selected ? 4.2 : 1.75} transparent opacity={0.96} />
      </mesh>
      <mesh scale={hovered || selected ? 1.65 : 1}>
        <sphereGeometry args={[0.28 + memory.intensity * 0.12, 20, 20]} />
        <meshBasicMaterial color={color} transparent opacity={hovered || selected ? 0.2 : 0.055} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {hovered || selected ? <Html distanceFactor={8} position={[0.22, 0.18, 0]} className="memory-star-label">{memory.title}</Html> : null}
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
    const value = new THREE.BufferGeometry()
    value.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    return value
  }, [memories])

  useEffect(() => () => lines.dispose(), [lines])

  return (
    <group>
      <lineSegments geometry={lines} frustumCulled={false}>
        <lineBasicMaterial color="#8fdcff" transparent opacity={0.24} blending={THREE.AdditiveBlending} depthWrite={false} />
      </lineSegments>
      {memories.map((memory) => <MemoryStar key={memory.id} memory={memory} selected={selectedMemory?.id === memory.id} onHover={onHover} onSelect={onSelect} />)}
    </group>
  )
}

function OrbCompanion3D({ onGuide, reducedMotion = false }: { onGuide: () => void; reducedMotion?: boolean }) {
  const ref = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!ref.current || reducedMotion) return
    ref.current.position.y = 1.32 + Math.sin(clock.elapsedTime * 1.1) * 0.075
    ref.current.rotation.y = clock.elapsedTime * 0.18
  })

  return (
    <group ref={ref} position={[0, 1.32, 1.92]} data-testid="orb-companion">
      <mesh onClick={(event) => { event.stopPropagation(); onGuide() }}>
        <sphereGeometry args={[0.28, 28, 28]} />
        <meshStandardMaterial color="#091124" emissive="#67e8f9" emissiveIntensity={3.1} roughness={0.16} metalness={0.14} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.66, 24, 24]} />
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
    const target = new THREE.Vector3(...selectedMemory.position)
    const position = new THREE.Vector3(selectedMemory.position[0] * 0.5, selectedMemory.position[1] + 0.85, selectedMemory.position[2] + 3)
    camera.position.lerp(position, reducedMotion ? 0.2 : Math.min(0.14, delta * 1.9))
    camera.lookAt(target)
  })
  return <group data-testid="replay-camera-rig" />
}

function SpatialScene({ mode, selectedMemory, onHover, onSelect, onGuide, reducedMotion, particleCount, shadows, postprocessing }: SpatialSceneProps) {
  const memories = URAI_SPATIAL_DEMO_DATA.memories
  const isLifeMap = mode === 'life-map' || mode === 'spatial'

  return (
    <>
      <color attach="background" args={[isLifeMap ? '#02030a' : '#071126']} />
      <fog attach="fog" args={['#08142f', 8, 26]} />
      <PerspectiveCamera makeDefault position={isLifeMap ? [0, 2.6, 9.2] : [0, 2.05, 6.8]} fov={isLifeMap ? 50 : 44} />
      <ReplayCameraRig selectedMemory={selectedMemory} reducedMotion={reducedMotion} />
      <OrbitControls enablePan={false} enableZoom zoomSpeed={0.62} enableDamping={!reducedMotion} dampingFactor={0.065} rotateSpeed={0.36} minDistance={3.2} maxDistance={14} minPolarAngle={0.68} maxPolarAngle={1.82} />
      <ambientLight intensity={0.58} color="#c7ddff" />
      <hemisphereLight args={['#dbeafe', '#09051f', 1.2]} />
      <directionalLight position={[-4, 7, 4]} intensity={1.8} color="#dbeafe" castShadow={shadows} />
      <pointLight position={[0, 2.25, 1.8]} intensity={3.1} color="#67e8f9" distance={8} />
      <pointLight position={[-4, 3, -4]} intensity={1.2} color="#a78bfa" distance={12} />
      <SkyDome reducedMotion={reducedMotion} />
      <SpatialWorldAssetLayer phase={spatialAssetPhaseForMode(mode)} />
      <DreamTerrain reducedMotion={reducedMotion} />
      <AvatarAnchor reducedMotion={reducedMotion} />
      <MemoryConstellation memories={memories} selectedMemory={selectedMemory} onHover={onHover} onSelect={onSelect} />
      <OrbCompanion3D onGuide={onGuide} reducedMotion={reducedMotion} />
      <AuraParticles reducedMotion={reducedMotion} particleCount={particleCount} />
      {postprocessing && !reducedMotion ? (
        <EffectComposer enabled>
          <Bloom intensity={0.82} luminanceThreshold={0.12} luminanceSmoothing={0.28} />
          <Vignette eskil={false} offset={0.18} darkness={0.62} />
        </EffectComposer>
      ) : null}
    </>
  )
}

function SpatialHUD({ mode, selectedMemory, hoveredMemory, companionMessage, onClose, onGuide, onOpenLifeMap, onReturnHome }: { mode: SpatialWorldMode; selectedMemory: SpatialMemory | null; hoveredMemory: SpatialMemory | null; companionMessage: string; onClose: () => void; onGuide: () => void; onOpenLifeMap: () => void; onReturnHome: () => void }) {
  const active = selectedMemory ?? hoveredMemory
  const isLifeMap = mode === 'life-map' || mode === 'spatial'

  return (
    <div className="spatial-hud">
      <section className="spatial-hud__top" aria-label="URAI Spatial world header">
        <p className="spatial-hud__eyebrow">URAI Spatial</p>
        <h1>{isLifeMap ? 'Living 3D memory field' : 'Spatial home world'}</h1>
        <p>{isLifeMap ? 'Drag to orbit. Scroll to move through depth. Click a star to open its memory thread.' : 'The orb, body, ground, and sky are online. Open the Life Map to move into the memory field.'}</p>
        <span className="spatial-hud__pill">Orbit · zoom · select</span>
        <div className="spatial-hud__actions spatial-hud__actions--nav">
          {isLifeMap ? <button type="button" onClick={onReturnHome}>Return home</button> : <button type="button" className="primary" onClick={onOpenLifeMap}>Open Life Map</button>}
          <button type="button" onClick={onGuide}>Ask Orb</button>
        </div>
      </section>
      <section className="spatial-hud__companion" aria-live="polite">{companionMessage}</section>
      {active ? (
        <section className="spatial-hud__detail" data-testid="life-map-detail-panel" aria-label="Selected memory detail">
          <p className="spatial-hud__eyebrow">{selectedMemory ? 'Focused memory' : 'Memory preview'}</p>
          <h2>{active.title}</h2>
          <p>{active.replayText}</p>
          <div className="spatial-hud__meta">
            <span>{active.emotion}</span><span>{active.archetype}</span><span>{active.season}</span><span>{Math.round(active.intensity * 100)} intensity</span>
          </div>
          {selectedMemory ? <div className="spatial-hud__actions"><button type="button" className="primary" onClick={onGuide}>Ask Orb</button><button type="button" onClick={onClose}>Unwind focus</button></div> : null}
        </section>
      ) : null}
    </div>
  )
}

function SpatialWorldCanvasImpl({ mode = 'home', embedded = false }: SpatialWorldProps) {
  const quality = useAdaptiveSpatialQuality()
  const webglAvailable = useWebGLAvailable()
  const [worldMode, setWorldMode] = useState<SpatialWorldMode>(mode)
  const [selectedMemory, setSelectedMemory] = useState<SpatialMemory | null>(null)
  const [hoveredMemory, setHoveredMemory] = useState<SpatialMemory | null>(null)
  const [companionMessage, setCompanionMessage] = useState('The orb is ready. Drag the world, scroll through depth, or open the Life Map.')

  const closeFocus = useCallback(() => setSelectedMemory(null), [])
  const openLifeMap = useCallback(() => {
    setWorldMode('life-map')
    setCompanionMessage('Life Map opened. Orbit the field, then choose the star that feels most alive.')
  }, [])
  const returnHome = useCallback(() => {
    setSelectedMemory(null)
    setHoveredMemory(null)
    setWorldMode('home')
    setCompanionMessage('Returned home. The sky is still open when you are ready.')
  }, [])
  const guide = useCallback(() => {
    setCompanionMessage(selectedMemory ? `Orb note: ${selectedMemory.title} belongs to the ${selectedMemory.season} arc.` : 'Orb note: start with the brightest star, then follow the connected thread.')
  }, [selectedMemory])

  useEffect(() => setWorldMode(mode), [mode])
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') closeFocus() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeFocus])

  return (
    <main className="spatial-world-root" data-mode={worldMode} data-embed={embedded ? 'true' : 'false'} data-quality-tier={quality.tier} data-document-visible={quality.documentVisible ? 'true' : 'false'}>
      <SpatialWorldStyles />
      {!webglAvailable ? (
        <SpatialFallbackPanel reason="WebGL is unavailable, so URAI is showing the spatial fallback panel." />
      ) : (
        <Suspense fallback={<div className="spatial-world-loading"><SpatialFallbackPanel reason="Loading the 3D memory world." /></div>}>
          <Canvas
            data-testid="spatial-world-canvas"
            shadows={quality.shadows}
            dpr={[1, quality.pixelRatioMax]}
            frameloop={quality.documentVisible ? 'always' : 'never'}
            gl={{ antialias: quality.antialias, alpha: false, powerPreference: quality.tier === 'high' ? 'high-performance' : 'default' }}
            onCreated={({ gl }) => gl.setPixelRatio(Math.min(window.devicePixelRatio, quality.pixelRatioMax))}
          >
            <SpatialScene
              mode={worldMode}
              selectedMemory={selectedMemory}
              onHover={setHoveredMemory}
              onSelect={setSelectedMemory}
              onGuide={guide}
              reducedMotion={quality.reducedMotion}
              particleCount={quality.particleCount}
              shadows={quality.shadows}
              postprocessing={quality.postprocessing}
            />
          </Canvas>
        </Suspense>
      )}
      <SpatialHUD mode={worldMode} selectedMemory={selectedMemory} hoveredMemory={hoveredMemory} companionMessage={companionMessage} onClose={closeFocus} onGuide={guide} onOpenLifeMap={openLifeMap} onReturnHome={returnHome} />
    </main>
  )
}

export const SpatialWorldCanvas = dynamic(() => Promise.resolve(SpatialWorldCanvasImpl), {
  ssr: false,
  loading: () => <SpatialFallbackPanel reason="Preparing the client-only spatial world." />,
})

export default SpatialWorldCanvas
export { SpatialScene, MemoryConstellation, MemoryStar, OrbCompanion3D, DreamTerrain, SkyDome, AvatarAnchor, ReplayCameraRig, SpatialFallbackPanel, SpatialHUD }
