'use client'

import Link from 'next/link'
import AdamLauncherSlot from '@/spatial/adam/AdamLauncherSlot'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer, PerspectiveCamera, useGLTF } from '@react-three/drei'
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { MobileMovementPad, MovementHelp, stepEmbodiedMotion, useDragLook, useMovementInput, type MovementInput } from '@/spatial/navigation/EmbodiedNavigation'
import { useReducedMotion } from '@/spatial/hooks/useReducedMotion'
import { useAdaptiveSpatialQuality } from '@/spatial/performance/useAdaptiveSpatialQuality'

const LEGACY_MODEL = '/assets/urai/generated/models/legacy-archive-foundation-v1.glb'
const LIFE_MAP_DESTINATION = '/life-map?from=legacy&overview=1'
const CAMERA_HEIGHT = 1.68
const ARCHIVE_BAYS = [
  ...[-4.65, 4.65].flatMap((x) => [-5.9, -3.55, -1.2, 1.15, 3.5, 5.85].map((z) => ({ x, z, rotation: x < 0 ? 0 : Math.PI }))),
  ...[-2, 0, 2].map((x) => ({ x, z: -6.1, rotation: -Math.PI / 2 })),
]

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
  const foundation = useMemo(() => {
    const scene = gltf.scene.clone(true)
    const materials = new Set<THREE.Material>()
    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      object.castShadow = true
      object.receiveShadow = true
      object.frustumCulled = true
      const finish = (source: THREE.Material) => {
        const material = source.clone()
        materials.add(material)
        if (material instanceof THREE.MeshStandardMaterial) {
          material.color.set(source.name === 'provenance-gold' ? '#a58a5b' : source.name === 'moon-ivory' ? '#c7b997' : '#766957')
          material.metalness = source.name === 'provenance-gold' ? .55 : .08
          material.roughness = .86
          material.emissive.set('#49341c')
          material.emissiveIntensity = .025
          material.normalScale.set(.18, .18)
          material.transparent = false
          material.opacity = 1
        }
        if (material instanceof THREE.MeshPhysicalMaterial) {
          material.transmission = 0
          material.clearcoat = .08
        }
        return material
      }
      object.material = Array.isArray(object.material) ? object.material.map(finish) : finish(object.material)
    })
    return { scene, materials }
  }, [gltf.scene])
  useEffect(() => () => foundation.materials.forEach((material) => material.dispose()), [foundation])
  return <primitive object={foundation.scene} scale={1.04} position={[0, -0.06, -0.8]} name="legacy-archive-foundation-v1" />
}

function ArchiveVolumes() {
  const volumes = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    if (!volumes.current) return
    const transform = new THREE.Object3D()
    const colors = ['#847453', '#485d58', '#69524c', '#b09870', '#515665']
    let index = 0
    for (const bay of ARCHIVE_BAYS) {
      for (const y of [.46, 1.12, 1.78, 2.44, 3.1]) for (let book = 0; book < 9; book += 1) {
        const height = .3 + ((index * 17) % 9) * .014
        const offset = (book - 4) * .145
        transform.position.set(bay.x + .29 * Math.cos(bay.rotation) + offset * Math.sin(bay.rotation), y + height / 2, bay.z - .29 * Math.sin(bay.rotation) + offset * Math.cos(bay.rotation))
        transform.scale.set(.23, height, .115 + (index % 3) * .007)
        transform.rotation.set(index % 7 === 0 ? .07 : 0, bay.rotation, 0)
        transform.updateMatrix()
        volumes.current.setMatrixAt(index, transform.matrix)
        volumes.current.setColorAt(index, new THREE.Color(colors[index % colors.length]))
        index += 1
      }
    }
    volumes.current.instanceMatrix.needsUpdate = true
    if (volumes.current.instanceColor) volumes.current.instanceColor.needsUpdate = true
    volumes.current.computeBoundingSphere()
  }, [])
  return <instancedMesh ref={volumes} args={[undefined, undefined, ARCHIVE_BAYS.length * 45]} name="legacy-authored-book-spines" castShadow receiveShadow><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color="#ffffff" roughness={.91} /></instancedMesh>
}

function ArchiveFurniture() {
  return <group name="legacy-authored-archive-furnishings">
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.035, 0]} receiveShadow><planeGeometry args={[11, 15.5]} /><meshStandardMaterial color="#564b3c" roughness={.9} /></mesh>
    {ARCHIVE_BAYS.map(({ x, z, rotation }, index) => <group key={`${x}-${z}`} position={[x, 0, z]} rotation={[0, rotation, 0]}>
      <mesh position={[0, 1.8, 0]} castShadow receiveShadow><boxGeometry args={[0.54, 3.6, 1.55]} /><meshStandardMaterial color="#493326" roughness={0.86} /></mesh>
      {[0.43, 1.09, 1.75, 2.41, 3.07].map((y) => <mesh key={y} position={[.29, y, 0]} receiveShadow><boxGeometry args={[.34, .05, 1.48]} /><meshStandardMaterial color={index % 2 ? '#72533c' : '#654934'} roughness={.82} /></mesh>)}
    </group>)}
    <ArchiveVolumes />
    {[-5.2, -2.1, 1, 4.1].map((z) => <group key={z} position={[0, 0, z]}><mesh position={[0, 0.72, 0]} castShadow receiveShadow><boxGeometry args={[2.05, 0.12, 0.9]} /><meshStandardMaterial color="#72513a" roughness={0.72} /></mesh><mesh position={[0, 0.36, 0]} castShadow><cylinderGeometry args={[0.2, 0.25, 0.72, 20]} /><meshStandardMaterial color="#302720" roughness={0.85} /></mesh><mesh position={[.55, .81, -.1]} rotation={[0,.15,0]}><boxGeometry args={[.34,.055,.42]} /><meshStandardMaterial color="#b9aa8c" roughness={.95} /></mesh></group>)}
  </group>
}

function LegacyScene({ input, yaw, pitch, reducedMotion, shellRef }: { input: MovementInput; yaw: MutableRefObject<number>; pitch: MutableRefObject<number>; reducedMotion: boolean; shellRef: MutableRefObject<HTMLDivElement | null> }) {
  const quality = useAdaptiveSpatialQuality()
  return <>
    <color attach="background" args={['#15120f']} /><fog attach="fog" args={['#211c17', 9, 28]} />
    <PerspectiveCamera makeDefault position={[0, CAMERA_HEIGHT, 6.2]} fov={44} />
    <ambientLight intensity={0.48} color="#eadfce" /><hemisphereLight intensity={0.7} color="#f0e5d5" groundColor="#382f27" />
    <directionalLight position={[-4.5, 8, 4]} intensity={1.55} color="#f4eadb" castShadow={quality.shadows} shadow-mapSize-width={quality.tier === 'high' ? 1024 : 512} shadow-mapSize-height={quality.tier === 'high' ? 1024 : 512} />
    <pointLight position={[0, 2.1, -4]} intensity={12} distance={12} color="#c9a66d" />
    <LegacyCamera input={input} yaw={yaw} pitch={pitch} reducedMotion={reducedMotion} shellRef={shellRef} />
    <LegacyFoundation /><ArchiveFurniture />
    {quality.tier === 'low' ? null : <ContactShadows position={[0, 0.01, 0]} opacity={0.38} scale={12} blur={2.8} far={7} />}
    <Environment resolution={64} frames={1} environmentIntensity={.35}><Lightformer position={[-4,5,2]} rotation={[0,Math.PI/4,0]} scale={[5,4,1]} color="#ffedcc" intensity={2}/><Lightformer position={[4,4,-3]} rotation={[0,-Math.PI/4,0]} scale={[3,4,1]} color="#d6e7ec" intensity={1}/></Environment>
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
    <div className="legacyFounderSlot"><AdamLauncherSlot name="legacy-world" /></div>
    <section className="legacyIntroduction" style={{position:'absolute',left:'clamp(16px,4vw,48px)',bottom:'clamp(18px,4vw,44px)',zIndex:30,width:'min(470px,calc(100vw - 32px))',padding:'18px 20px 20px',border:'1px solid rgba(236,220,196,.16)',borderRadius:22,background:'rgba(21,17,13,.66)',boxShadow:'0 22px 70px rgba(0,0,0,.34)',backdropFilter:'blur(16px)'}}>
      <p style={{margin:0,color:'rgba(239,220,190,.62)',fontSize:11,fontWeight:700,letterSpacing:'.2em',textTransform:'uppercase'}}>Legacy Archive</p><h1 style={{margin:'6px 0 0',fontSize:'clamp(30px,5vw,46px)',lineHeight:1,letterSpacing:'-.04em'}}>Continuity has a place.</h1><p style={{margin:'10px 0 0',maxWidth:'40ch',color:'rgba(247,239,226,.72)',fontSize:14,lineHeight:1.55}}>Walk the archive. Open continuity in Life Map when you choose.</p>
      <div data-movement-ui="true" style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:14}}><Link href={LIFE_MAP_DESTINATION} style={{padding:'9px 13px',borderRadius:999,background:'#f1eadf',color:'#241b14',fontSize:12,fontWeight:800,textDecoration:'none'}}>Open Life Map</Link><Link href="/home" style={{padding:'9px 13px',borderRadius:999,border:'1px solid rgba(255,255,255,.17)',color:'#fff',fontSize:12,fontWeight:700,textDecoration:'none'}}>Return Home</Link></div>
    </section>
    <MovementHelp realm="Legacy Archive" summary="Walk among shelves and reading tables before moving into your continuity map." controls="WASD or arrow keys move. Drag to look. Mobile controls appear on touch devices." /><MobileMovementPad input={input} label="Move through Legacy Archive" />
    <style jsx>{`.legacyFounderSlot{position:absolute;left:max(16px,env(safe-area-inset-right));top:max(16px,env(safe-area-inset-top));z-index:35}.legacyIntroduction{box-sizing:border-box}.legacyIntroduction a{display:inline-flex;align-items:center;min-height:48px;box-sizing:border-box}@media(max-width:700px){.legacyIntroduction{top:80px;bottom:auto!important;padding:12px 14px!important;max-height:34svh;overflow-y:auto}.legacyIntroduction h1{font-size:24px!important}.legacyIntroduction p{font-size:12px!important}}`}</style>
  </main>
}

useGLTF.preload(LEGACY_MODEL)
