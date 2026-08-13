'use client'

import Link from 'next/link'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, PerspectiveCamera, useGLTF } from '@react-three/drei'
import { Suspense, useEffect, useRef, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { MobileMovementPad, MovementHelp, stepEmbodiedMotion, useDragLook, useMovementInput, type MovementInput } from '@/spatial/navigation/EmbodiedNavigation'
import { useReducedMotion } from '@/spatial/hooks/useReducedMotion'
import { useAdaptiveSpatialQuality } from '@/spatial/performance/useAdaptiveSpatialQuality'

const LEGACY_MODEL = '/assets/urai/generated/models/legacy-archive-foundation-v1.glb'
const LIFE_MAP_DESTINATION = '/life-map?from=legacy&overview=1'
const CAMERA_HEIGHT = 1.68

function LegacyCamera({ input, yaw, pitch, reducedMotion, shellRef }: { input: MovementInput; yaw: MutableRefObject<number>; pitch: MutableRefObject<number>; reducedMotion: boolean; shellRef: MutableRefObject<HTMLDivElement | null> }) {
  const { camera } = useThree()
  const position = useRef(new THREE.Vector3(0, 0, 6.2))
  const velocity = useRef(new THREE.Vector3())
  const target = useRef<THREE.Vector3 | null>(null)
  const direction = useRef(new THREE.Vector3())

  useFrame((_, delta) => {
    const motion = stepEmbodiedMotion({
      position: position.current,
      velocity: velocity.current,
      input,
      target,
      yaw: yaw.current,
      delta,
      speed: reducedMotion ? 1.45 : 2.1,
      acceleration: 8.2,
      deceleration: 10,
      bounds: { minX: -4.7, maxX: 4.7, minZ: -7.1, maxZ: 7.0 },
      obstacles: [-5.2, -2.1, 1.0, 4.1].map((z) => ({ x: 0, z, radius: 1.05 })),
      arrivalRadius: 0.32,
    })
    camera.position.set(position.current.x, CAMERA_HEIGHT, position.current.z)
    direction.current.set(-Math.sin(yaw.current) * Math.cos(pitch.current), Math.sin(pitch.current), -Math.cos(yaw.current) * Math.cos(pitch.current))
    camera.lookAt(direction.current.add(camera.position))
    if (shellRef.current) {
      shellRef.current.dataset.legacyCameraX = camera.position.x.toFixed(3)
      shellRef.current.dataset.legacyCameraZ = camera.position.z.toFixed(3)
      shellRef.current.dataset.legacyMoving = motion.moving ? 'true' : 'false'
      shellRef.current.dataset.legacyReady = 'true'
    }
  })
  return null
}

function LegacyFoundation() {
  const gltf = useGLTF(LEGACY_MODEL)
  useEffect(() => {
    gltf.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      object.castShadow = true
      object.receiveShadow = true
      object.frustumCulled = true
    })
  }, [gltf.scene])
  return <primitive object={gltf.scene} scale={1.04} position={[0, -0.06, -0.8]} name="legacy-archive-foundation-v1" />
}

function ArchiveFurniture() {
  const shelfZ = [-5.9, -3.55, -1.2, 1.15, 3.5, 5.85]
  return <group name="legacy-authored-archive-furnishings">
    {[-4.65, 4.65].flatMap((x) => shelfZ.map((z, index) => <group key={`${x}-${z}`} position={[x, 0, z]}>
      <mesh position={[0, 1.8, 0]} castShadow receiveShadow><boxGeometry args={[0.54, 3.6, 1.55]} /><meshStandardMaterial color="#493326" roughness={0.86} /></mesh>
      {[0.46, 1.12, 1.78, 2.44, 3.1].map((y, bookIndex) => <mesh key={y} position={[x < 0 ? 0.29 : -0.29, y, 0]} castShadow><boxGeometry args={[0.14, 0.42, 1.25]} /><meshStandardMaterial color={(index + bookIndex) % 2 ? '#826c53' : '#66533f'} roughness={0.9} /></mesh>)}
    </group>))}
    {[-5.2, -2.1, 1, 4.1].map((z) => <group key={z} position={[0, 0, z]}><mesh position={[0, 0.72, 0]} castShadow receiveShadow><boxGeometry args={[2.05, 0.12, 0.9]} /><meshStandardMaterial color="#50382b" roughness={0.78} /></mesh><mesh position={[0, 0.36, 0]} castShadow><cylinderGeometry args={[0.2, 0.25, 0.72, 20]} /><meshStandardMaterial color="#302720" roughness={0.85} /></mesh></group>)}
  </group>
}

function LegacyScene({ input, yaw, pitch, reducedMotion, shellRef }: { input: MovementInput; yaw: MutableRefObject<number>; pitch: MutableRefObject<number>; reducedMotion: boolean; shellRef: MutableRefObject<HTMLDivElement | null> }) {
  const quality = useAdaptiveSpatialQuality()
  return <>
    <color attach="background" args={['#15120f']} /><fog attach="fog" args={['#211c17', 9, 28]} />
    <PerspectiveCamera makeDefault position={[0, CAMERA_HEIGHT, 6.2]} fov={44} />
    <ambientLight intensity={0.34} color="#eadfce" /><hemisphereLight intensity={0.58} color="#f0e5d5" groundColor="#382f27" />
    <directionalLight position={[-4.5, 8, 4]} intensity={1.55} color="#f4eadb" castShadow={quality.shadows} shadow-mapSize-width={quality.tier === 'high' ? 1024 : 512} shadow-mapSize-height={quality.tier === 'high' ? 1024 : 512} />
    <pointLight position={[0, 2.1, -4]} intensity={12} distance={12} color="#c9a66d" />
    <LegacyCamera input={input} yaw={yaw} pitch={pitch} reducedMotion={reducedMotion} shellRef={shellRef} />
    <LegacyFoundation /><ArchiveFurniture />
    {quality.tier === 'low' ? null : <ContactShadows position={[0, 0.01, 0]} opacity={0.38} scale={12} blur={2.8} far={7} />}
    <Environment preset="apartment" environmentIntensity={quality.tier === 'low' ? 0.12 : 0.2} />
  </>
}

export default function LegacyArchiveWorld() {
  const reducedMotion = useReducedMotion()
  const quality = useAdaptiveSpatialQuality()
  const shellRef = useRef<HTMLDivElement | null>(null)
  const yaw = useRef(0)
  const pitch = useRef(-0.03)
  const input = useMovementInput()
  const dragLook = useDragLook({ yaw, pitch, enabled: true, sensitivity: reducedMotion ? 0.0024 : 0.0038 })

  return <main ref={shellRef} data-testid="urai-legacy-archive-world" data-legacy-model-authority="legacy-archive-foundation-v1" data-spatial-quality-tier={quality.tier} style={{position:'fixed',inset:0,minHeight:'100svh',overflow:'hidden',background:'#15120f',color:'#f8f3ea',fontFamily:'var(--font-sans)'}} {...dragLook}>
    <div style={{position:'absolute',inset:0}}><Canvas shadows={quality.shadows} dpr={[1, quality.pixelRatioMax]} frameloop={quality.documentVisible?'always':'never'} gl={{antialias:quality.antialias,alpha:false,powerPreference:'high-performance'}}><Suspense fallback={null}><LegacyScene input={input} yaw={yaw} pitch={pitch} reducedMotion={reducedMotion} shellRef={shellRef} /></Suspense></Canvas></div>
    <section style={{position:'absolute',left:'clamp(16px,4vw,48px)',bottom:'clamp(18px,4vw,44px)',zIndex:30,width:'min(470px,calc(100vw - 32px))',padding:'18px 20px 20px',border:'1px solid rgba(236,220,196,.16)',borderRadius:22,background:'rgba(21,17,13,.66)',boxShadow:'0 22px 70px rgba(0,0,0,.34)',backdropFilter:'blur(16px)'}}>
      <p style={{margin:0,color:'rgba(239,220,190,.62)',fontSize:11,fontWeight:700,letterSpacing:'.2em',textTransform:'uppercase'}}>Legacy Archive</p><h1 style={{margin:'6px 0 0',fontSize:'clamp(30px,5vw,46px)',lineHeight:1,letterSpacing:'-.04em'}}>Continuity has a place.</h1><p style={{margin:'10px 0 0',maxWidth:'40ch',color:'rgba(247,239,226,.72)',fontSize:14,lineHeight:1.55}}>Walk the archive. Open continuity in Life Map when you choose.</p>
      <div data-movement-ui="true" style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:14}}><Link href={LIFE_MAP_DESTINATION} style={{padding:'9px 13px',borderRadius:999,background:'#f1eadf',color:'#241b14',fontSize:12,fontWeight:800,textDecoration:'none'}}>Open continuity in Life Map</Link><Link href="/home" style={{padding:'9px 13px',borderRadius:999,border:'1px solid rgba(255,255,255,.17)',color:'#fff',fontSize:12,fontWeight:700,textDecoration:'none'}}>Return Home</Link></div>
    </section>
    <MovementHelp realm="Legacy Archive" summary="Walk among shelves and reading tables before moving into your continuity map." controls="WASD or arrow keys move. Drag to look. Mobile controls appear on touch devices." /><MobileMovementPad input={input} label="Move through Legacy Archive" />
  </main>
}

useGLTF.preload(LEGACY_MODEL)
