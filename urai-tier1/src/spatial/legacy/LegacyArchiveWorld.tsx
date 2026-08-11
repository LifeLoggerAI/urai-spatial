'use client'

import Link from 'next/link'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, PerspectiveCamera, useGLTF } from '@react-three/drei'
import { Suspense, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { MobileMovementPad, MovementHelp, stepEmbodiedMotion, useDragLook, useMovementInput, type MovementInput } from '@/spatial/navigation/EmbodiedNavigation'
import { useReducedMotion } from '@/spatial/hooks/useReducedMotion'

const LEGACY_MODEL = '/assets/urai/generated/hero-realms-v2/legacy-archive-hero-v2.glb'
const CAMERA_HEIGHT = 1.68
const LIFE_MAP_DESTINATION = '/life-map?from=legacy&overview=1'

type CameraProps = {
  input: MovementInput
  yaw: MutableRefObject<number>
  pitch: MutableRefObject<number>
  reducedMotion: boolean
  shellRef: MutableRefObject<HTMLDivElement | null>
}

function useModelAvailability(url: string) {
  const [available, setAvailable] = useState<boolean | null>(null)
  useEffect(() => {
    let cancelled = false
    fetch(url, { method: 'HEAD', cache: 'no-store' })
      .then((response) => { if (!cancelled) setAvailable(response.ok) })
      .catch(() => { if (!cancelled) setAvailable(false) })
    return () => { cancelled = true }
  }, [url])
  return available
}

function LegacyCamera({ input, yaw, pitch, reducedMotion, shellRef }: CameraProps) {
  const { camera } = useThree()
  const position = useRef(new THREE.Vector3(0, 0, 6.5))
  const velocity = useRef(new THREE.Vector3())
  const target = useRef<THREE.Vector3 | null>(null)
  const scratch = useRef(new THREE.Vector3())

  useFrame((_, delta) => {
    const motion = stepEmbodiedMotion({
      position: position.current,
      velocity: velocity.current,
      input,
      target,
      yaw: yaw.current,
      delta,
      speed: reducedMotion ? 1.5 : 2.2,
      acceleration: 8.2,
      deceleration: 10,
      bounds: { minX: -4.7, maxX: 4.7, minZ: -7.1, maxZ: 7.0 },
      obstacles: [
        { x: 0, z: -5.5, radius: 1.35 },
        { x: 0, z: -2.2, radius: 1.15 },
        { x: 0, z: 1.1, radius: 1.15 },
        { x: 0, z: 4.4, radius: 1.15 },
      ],
      arrivalRadius: 0.32,
    })

    camera.position.set(position.current.x, CAMERA_HEIGHT, position.current.z)
    const direction = scratch.current.set(
      -Math.sin(yaw.current) * Math.cos(pitch.current),
      Math.sin(pitch.current),
      -Math.cos(yaw.current) * Math.cos(pitch.current),
    )
    camera.lookAt(direction.add(camera.position))

    if (shellRef.current) {
      shellRef.current.dataset.legacyCameraX = camera.position.x.toFixed(3)
      shellRef.current.dataset.legacyCameraZ = camera.position.z.toFixed(3)
      shellRef.current.dataset.legacyMoving = motion.moving ? 'true' : 'false'
      shellRef.current.dataset.legacyReady = 'true'
    }
  })

  return null
}

function prepareScene(source: THREE.Object3D) {
  const clone = source.clone(true)
  clone.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    object.castShadow = true
    object.receiveShadow = true
    object.frustumCulled = true
  })
  return clone
}

function HeroLegacyArchive() {
  const model = useGLTF(LEGACY_MODEL)
  const scene = useMemo(() => prepareScene(model.scene), [model.scene])
  return <primitive object={scene} name="legacy-archive-hero-v2-model" />
}

function SafePhysicalFallback() {
  const shelfPositions = [-6.1, -3.7, -1.3, 1.1, 3.5, 5.9]
  return (
    <group name="legacy-physical-fallback" userData={{ role: 'physical-fallback-until-hero-glb-receipt' }}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[13, 18]} />
        <meshStandardMaterial color="#4f4b44" roughness={0.94} metalness={0.01} />
      </mesh>
      {[-5.35, 5.35].flatMap((x) => shelfPositions.map((z, index) => (
        <group key={`${x}-${z}`} position={[x, 0, z]}>
          <mesh position={[0, 2.15, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.62, 4.3, 1.85]} />
            <meshStandardMaterial color="#4b3325" roughness={0.82} />
          </mesh>
          {[0.55, 1.35, 2.15, 2.95, 3.75].map((y) => (
            <mesh key={y} position={[x < 0 ? 0.28 : -0.28, y, 0]} castShadow>
              <boxGeometry args={[0.16, 0.48, 1.5]} />
              <meshStandardMaterial color={index % 2 ? '#7a6650' : '#685847'} roughness={0.9} />
            </mesh>
          ))}
        </group>
      ))}
      {[-5.5, -2.2, 1.1, 4.4].map((z) => (
        <group key={z} position={[0, 0, z]}>
          <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.3, 0.13, 1]} />
            <meshStandardMaterial color="#4d3428" roughness={0.78} />
          </mesh>
          <mesh position={[0, 0.38, 0]} castShadow>
            <cylinderGeometry args={[0.22, 0.28, 0.72, 24]} />
            <meshStandardMaterial color="#342a24" roughness={0.82} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function LegacyScene({ modelAvailable, ...cameraProps }: CameraProps & { modelAvailable: boolean | null }) {
  return (
    <>
      <color attach="background" args={['#171411']} />
      <fog attach="fog" args={['#28231e', 9, 27]} />
      <PerspectiveCamera makeDefault position={[0, CAMERA_HEIGHT, 6.5]} fov={44} />
      <ambientLight intensity={0.38} color="#e9ddcb" />
      <hemisphereLight intensity={0.62} color="#efe5d8" groundColor="#40372e" />
      <directionalLight position={[-4.5, 8, 4]} intensity={1.7} color="#efe7d8" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
      <directionalLight position={[4, 4, -5]} intensity={0.42} color="#d4b985" />
      <LegacyCamera {...cameraProps} />
      {modelAvailable ? <HeroLegacyArchive /> : <SafePhysicalFallback />}
      <ContactShadows position={[0, 0.012, 0]} opacity={0.45} scale={13} blur={3} far={8} />
      <Environment preset="apartment" environmentIntensity={0.2} />
    </>
  )
}

export default function LegacyArchiveWorld() {
  const reducedMotion = useReducedMotion()
  const modelAvailable = useModelAvailability(LEGACY_MODEL)
  const shellRef = useRef<HTMLDivElement | null>(null)
  const yaw = useRef(0)
  const pitch = useRef(-0.03)
  const input = useMovementInput()
  const dragLook = useDragLook({ yaw, pitch, enabled: true, sensitivity: reducedMotion ? 0.0025 : 0.004 })

  return (
    <main
      ref={shellRef}
      data-testid="urai-legacy-archive-world"
      data-legacy-model-authority={modelAvailable ? 'urai-hero-realms-v2' : 'physical-fallback-until-binary-receipt'}
      style={{ position: 'fixed', inset: 0, minHeight: '100svh', overflow: 'hidden', background: '#171411', color: '#f8f3ea', fontFamily: 'Inter,ui-sans-serif,system-ui' }}
      {...dragLook}
    >
      <div style={{ position: 'absolute', inset: 0 }}>
        <Canvas shadows dpr={[1, 1.75]} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}>
          <Suspense fallback={null}>
            <LegacyScene modelAvailable={modelAvailable} input={input} yaw={yaw} pitch={pitch} reducedMotion={reducedMotion} shellRef={shellRef} />
          </Suspense>
        </Canvas>
      </div>

      <section style={{ position: 'absolute', left: 'clamp(16px,4vw,48px)', bottom: 'clamp(18px,4vw,44px)', zIndex: 30, width: 'min(470px,calc(100vw - 32px))', padding: '18px 20px 20px', border: '1px solid rgba(236,220,196,.16)', borderRadius: 22, background: 'rgba(21,17,13,.66)', boxShadow: '0 22px 70px rgba(0,0,0,.34)', backdropFilter: 'blur(16px)' }}>
        <p style={{ margin: 0, color: 'rgba(239,220,190,.62)', fontSize: 11, fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase' }}>Legacy Archive</p>
        <h1 style={{ margin: '6px 0 0', fontSize: 'clamp(30px,5vw,46px)', lineHeight: 1, letterSpacing: '-.04em' }}>Continuity has a place.</h1>
        <p style={{ margin: '10px 0 0', maxWidth: '40ch', color: 'rgba(247,239,226,.72)', fontSize: 14, lineHeight: 1.55 }}>Walk the archive first. When you are ready, open the same continuity threads in Life Map rather than being thrown straight into another screen.</p>
        <div data-movement-ui="true" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
          <Link href={LIFE_MAP_DESTINATION} style={{ padding: '9px 13px', borderRadius: 999, background: '#f1eadf', color: '#241b14', fontSize: 12, fontWeight: 800, textDecoration: 'none' }}>Open continuity in Life Map</Link>
          <Link href="/" style={{ padding: '9px 13px', borderRadius: 999, border: '1px solid rgba(255,255,255,.17)', color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>Return Home</Link>
        </div>
      </section>

      <MovementHelp realm="Legacy Archive" summary="Walk among the shelves and reading tables before moving into your continuity map." controls="WASD / arrow keys to move. Drag the world to look. Mobile controls appear on touch devices." />
      <MobileMovementPad input={input} label="Move through Legacy Archive" />
    </main>
  )
}

useGLTF.preload(LEGACY_MODEL)
