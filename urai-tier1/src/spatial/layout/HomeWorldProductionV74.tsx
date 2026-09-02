'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, useGLTF, useTexture } from '@react-three/drei'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

const ROCK_DIFFUSE = '/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-diff-1k.webp'
const ROCK_NORMAL = '/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-normal-gl-1k.webp'
const ROCK_ARM = '/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-arm-1k.webp'
const HOME_HDR = '/assets/urai/home-production/cc0/environment/studio-small-08-1k.hdr'
const ROCK_FACE_A = '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_01/asset.gltf'
const ROCK_FACE_B = '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_02/asset.gltf'
const PIPE_SYSTEM = '/assets/urai/home-production/cc0/polyhaven-v48/modular_industrial_pipes_01/asset.gltf'
const CAGED_SCONCE = '/assets/urai/home-production/cc0/polyhaven-v48/industrial_caged_sconce/asset.gltf'

type Vec3 = readonly [number, number, number]
type TextureSet = { color: THREE.Texture; normal: THREE.Texture; arm: THREE.Texture }

function useStoneTextures(): TextureSet {
  const [colorSource, normalSource, armSource] = useTexture([ROCK_DIFFUSE, ROCK_NORMAL, ROCK_ARM])
  return useMemo(() => {
    const clone = (source: THREE.Texture, color = false) => {
      const texture = source.clone(); texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(3.1, 4.4); texture.anisotropy = 4; texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace; texture.needsUpdate = true; return texture
    }
    return { color: clone(colorSource, true), normal: clone(normalSource), arm: clone(armSource) }
  }, [armSource, colorSource, normalSource])
}

function prepareAsset(source: THREE.Object3D, span: number, mode: 'rock' | 'metal' | 'light') {
  const root = source.clone(true)
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    const originals = Array.isArray(object.material) ? object.material : [object.material]
    const materials = originals.map((entry) => {
      const clone = entry.clone()
      if (clone instanceof THREE.MeshStandardMaterial) {
        clone.roughness = Math.max(clone.roughness, mode === 'rock' ? 0.82 : 0.50)
        clone.metalness = mode === 'rock' ? Math.min(clone.metalness, 0.03) : Math.min(Math.max(clone.metalness, 0.18), 0.62)
        clone.envMapIntensity = mode === 'rock' ? 0.68 : 0.82
        if ('transmission' in clone) (clone as THREE.MeshPhysicalMaterial).transmission = 0
      }
      return clone
    })
    object.material = Array.isArray(object.material) ? materials : materials[0]
    object.castShadow = true; object.receiveShadow = true
  })
  const box = new THREE.Box3().setFromObject(root); const center = box.getCenter(new THREE.Vector3()); const size = box.getSize(new THREE.Vector3())
  root.position.sub(center); root.scale.setScalar(span / Math.max(size.x, size.y, size.z, 0.001)); return root
}

function ProductionAsset({ url, name, position, rotation = [0, 0, 0], scale = [1, 1, 1], span, mode }: { url: string; name: string; position: Vec3; rotation?: Vec3; scale?: Vec3; span: number; mode: 'rock' | 'metal' | 'light' }) {
  const gltf = useGLTF(url); const model = useMemo(() => prepareAsset(gltf.scene, span, mode), [gltf.scene, mode, span])
  return <group name={name} position={position as [number, number, number]} rotation={rotation as [number, number, number]} scale={scale as [number, number, number]} userData={{ productionAsset: url, retainedPixelAuthority: 'v74' }}><primitive object={model} /></group>
}

function RuntimeCameraSync({ reducedMotion }: { reducedMotion: boolean }) {
  const { camera, size } = useThree(); const yaw = useRef(0); const pitch = useRef(-0.025); const dragging = useRef(false); const last = useRef({ x: 0, y: 0 })
  useEffect(() => {
    const down = (event: PointerEvent) => { if (event.button === 0 || event.pointerType === 'touch') { dragging.current = true; last.current = { x: event.clientX, y: event.clientY } } }
    const move = (event: PointerEvent) => { if (!dragging.current || reducedMotion) return; const dx = event.clientX - last.current.x; const dy = event.clientY - last.current.y; last.current = { x: event.clientX, y: event.clientY }; yaw.current += dx * 0.003; pitch.current = THREE.MathUtils.clamp(pitch.current + dy * 0.0025, -0.34, 0.34) }
    const up = () => { dragging.current = false }
    window.addEventListener('pointerdown', down, true); window.addEventListener('pointermove', move, true); window.addEventListener('pointerup', up, true); window.addEventListener('pointercancel', up, true)
    return () => { window.removeEventListener('pointerdown', down, true); window.removeEventListener('pointermove', move, true); window.removeEventListener('pointerup', up, true); window.removeEventListener('pointercancel', up, true) }
  }, [reducedMotion])
  useFrame(() => {
    const world = document.querySelector<HTMLElement>('[data-urai-home-production]'); const x = Number.parseFloat(world?.dataset.homePlayerX ?? '0'); const z = Number.parseFloat(world?.dataset.homePlayerZ ?? '4.6'); const portrait = size.height > size.width
    if (camera instanceof THREE.PerspectiveCamera) { const fov = portrait ? 54 : 45; if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix() } }
    camera.position.set(Number.isFinite(x) ? x : 0, portrait ? 1.50 : 1.58, Number.isFinite(z) ? z : 4.6)
    const direction = new THREE.Vector3(-Math.sin(yaw.current), pitch.current, -Math.cos(yaw.current)).normalize(); camera.lookAt(camera.position.clone().add(direction.multiplyScalar(14)))
  })
  return null
}

function TaperedMember({ name, position, rotation = [0, 0, 0], scale, color = '#31413a', metalness = 0.46 }: { name: string; position: Vec3; rotation?: Vec3; scale: Vec3; color?: string; metalness?: number }) {
  const geometry = useMemo(() => { const shape = new THREE.Shape(); shape.moveTo(-0.52, -1); shape.lineTo(0.36, -0.82); shape.lineTo(0.50, 0.82); shape.lineTo(-0.28, 1); shape.lineTo(-0.56, 0.38); shape.closePath(); const result = new THREE.ExtrudeGeometry(shape, { depth: 0.36, bevelEnabled: true, bevelSegments: 5, bevelSize: 0.075, bevelThickness: 0.085, curveSegments: 10 }); result.center(); result.computeVertexNormals(); return result }, [])
  return <mesh name={name} geometry={geometry} position={position as [number, number, number]} rotation={rotation as [number, number, number]} scale={scale as [number, number, number]} castShadow receiveShadow><meshPhysicalMaterial color={color} roughness={0.54} metalness={metalness} clearcoat={0.08} clearcoatRoughness={0.68} envMapIntensity={0.86} /></mesh>
}

function TrapezoidThreshold({ name, position, rotation, tone, textures }: { name: string; position: Vec3; rotation: Vec3; tone: string; textures: TextureSet }) {
  const frame = useMemo(() => { const outer = new THREE.Shape(); outer.moveTo(-1.34, -1.38); outer.lineTo(1.24, -1.20); outer.lineTo(0.96, 1.38); outer.lineTo(-0.86, 1.58); outer.closePath(); const inner = new THREE.Path(); inner.moveTo(-0.68, -1.14); inner.lineTo(0.62, -1.06); inner.lineTo(0.50, 0.88); inner.lineTo(-0.46, 1.02); inner.closePath(); outer.holes.push(inner); const geometry = new THREE.ExtrudeGeometry(outer, { depth: 0.48, bevelEnabled: true, bevelSegments: 6, bevelSize: 0.09, bevelThickness: 0.10, curveSegments: 12 }); geometry.center(); return geometry }, [])
  return <group name={name} position={position as [number, number, number]} rotation={rotation as [number, number, number]}>
    <mesh geometry={frame} castShadow receiveShadow><meshPhysicalMaterial color="#35433c" map={textures.color} normalMap={textures.normal} normalScale={new THREE.Vector2(0.34, 0.34)} roughnessMap={textures.arm} roughness={0.82} metalness={0.08} envMapIntensity={0.72} /></mesh>
    <mesh position={[0.02, 0.08, 0.27]} scale={[1.08, 2.16, 1]}><planeGeometry args={[1, 1]} /><meshBasicMaterial color="#030807" /></mesh>
    <TaperedMember name={`${name}-service-jamb`} position={[-0.86, -0.04, 0.38]} rotation={[0, 0, 0.03]} scale={[0.17, 1.02, 0.20]} color="#4a544c" />
    <mesh position={[-0.66, 0.02, 0.58]} scale={[0.025, 0.84, 0.03]}><boxGeometry args={[1, 1, 1]} /><meshBasicMaterial color={tone} toneMapped={false} /></mesh>
    <pointLight position={[-0.44, 0.04, 0.86]} color={tone} intensity={0.72} distance={3.8} decay={2} />
  </group>
}

function ArmorPlate({ name, position, rotation, scale, color }: { name: string; position: Vec3; rotation: Vec3; scale: Vec3; color: string }) {
  const geometry = useMemo(() => { const shape = new THREE.Shape(); shape.moveTo(-0.52, -0.92); shape.lineTo(0.20, -1.00); shape.lineTo(0.58, -0.56); shape.lineTo(0.48, 0.52); shape.lineTo(0.10, 0.96); shape.lineTo(-0.44, 0.78); shape.lineTo(-0.62, 0.12); shape.closePath(); const result = new THREE.ExtrudeGeometry(shape, { depth: 0.24, bevelEnabled: true, bevelSegments: 5, bevelSize: 0.06, bevelThickness: 0.07, curveSegments: 10 }); result.center(); result.computeVertexNormals(); return result }, [])
  return <mesh name={name} geometry={geometry} position={position as [number, number, number]} rotation={rotation as [number, number, number]} scale={scale as [number, number, number]} castShadow receiveShadow><meshPhysicalMaterial color={color} roughness={0.48} metalness={0.50} clearcoat={0.12} clearcoatRoughness={0.58} envMapIntensity={0.96} /></mesh>
}

function Conduit({ name, points, radius = 0.045, color = '#4c5b52' }: { name: string; points: Vec3[]; radius?: number; color?: string }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z))), [points])
  return <mesh name={name} castShadow receiveShadow><tubeGeometry args={[curve, 28, radius, 8, false]} /><meshPhysicalMaterial color={color} roughness={0.42} metalness={0.58} envMapIntensity={0.90} /></mesh>
}

function RelicMachine() {
  return <group name="home-v74-integrated-relic-machine" userData={{ treatment: 'v74-open-armored-companion-machine', noSphere: true, noCage: true }}>
    <TaperedMember name="home-v74-rear-spine" position={[0, 2.18, -10.38]} scale={[0.30, 1.58, 0.42]} color="#24342e" />
    <TaperedMember name="home-v74-upper-crosshead" position={[0, 3.46, -9.92]} rotation={[0, 0, Math.PI / 2]} scale={[0.18, 1.18, 0.32]} color="#425047" />
    <TaperedMember name="home-v74-port-load-jaw" position={[-1.00, 2.06, -9.72]} rotation={[0.04, -0.04, -0.20]} scale={[0.15, 1.18, 0.30]} color="#38483f" />
    <TaperedMember name="home-v74-starboard-load-jaw" position={[1.04, 1.96, -9.70]} rotation={[-0.04, 0.05, 0.22]} scale={[0.15, 1.12, 0.30]} color="#33443c" />
    <TaperedMember name="home-v74-keel-anchor" position={[0.10, 0.72, -9.78]} rotation={[0, 0, Math.PI / 2]} scale={[0.16, 0.86, 0.34]} color="#283930" />
    <group name="home-v74-companion-armored-body" position={[0.04, 2.12, -9.28]}>
      <ArmorPlate name="home-v74-port-primary-shell" position={[-0.46, 0.08, 0.02]} rotation={[0.03, -0.18, -0.09]} scale={[0.82, 1.00, 0.86]} color="#29443a" />
      <ArmorPlate name="home-v74-starboard-primary-shell" position={[0.42, -0.04, -0.02]} rotation={[-0.04, 0.20, 0.10]} scale={[0.74, 0.94, 0.82]} color="#365047" />
      <ArmorPlate name="home-v74-port-shoulder" position={[-0.76, 0.46, -0.08]} rotation={[0.10, -0.26, -0.24]} scale={[0.42, 0.48, 0.54]} color="#40564c" />
      <ArmorPlate name="home-v74-starboard-shoulder" position={[0.72, 0.32, -0.10]} rotation={[-0.08, 0.24, 0.22]} scale={[0.38, 0.44, 0.50]} color="#314a40" />
      <ArmorPlate name="home-v74-port-keel" position={[-0.36, -0.74, -0.06]} rotation={[-0.10, -0.10, -0.14]} scale={[0.44, 0.50, 0.54]} color="#223a31" />
      <ArmorPlate name="home-v74-starboard-keel" position={[0.30, -0.80, -0.08]} rotation={[0.08, 0.12, 0.16]} scale={[0.36, 0.46, 0.50]} color="#3b5147" />
      <ArmorPlate name="home-v74-asymmetric-crown" position={[-0.08, 0.86, -0.12]} rotation={[0.12, -0.04, 1.50]} scale={[0.34, 0.68, 0.52]} color="#4b594f" />
      <mesh name="home-v74-recessed-companion-cavity" position={[0.02, 0.04, 0.19]} scale={[0.36, 0.88, 0.16]} castShadow receiveShadow><cylinderGeometry args={[0.70, 0.54, 1.60, 10, 1, false]} /><meshPhysicalMaterial color="#0a1714" roughness={0.42} metalness={0.62} envMapIntensity={0.72} /></mesh>
      <mesh name="home-v74-vertical-illuminated-aperture" position={[0.02, 0.04, 0.48]} scale={[0.052, 0.78, 0.045]}><boxGeometry args={[1, 1, 1]} /><meshPhysicalMaterial color="#ffe1a2" emissive="#d6a663" emissiveIntensity={1.4} roughness={0.14} metalness={0.04} toneMapped={false} /></mesh>
      <pointLight position={[0.02, 0.04, 0.80]} color="#9ecab8" intensity={1.05} distance={4.4} decay={2} />
    </group>
    <Conduit name="home-v74-port-shoulder-service" points={[[-2.48, 2.62, -10.38], [-1.92, 2.82, -10.06], [-1.42, 2.56, -9.74], [-0.82, 2.54, -9.28]]} radius={0.055} />
    <Conduit name="home-v74-starboard-shoulder-service" points={[[2.54, 2.38, -10.34], [2.04, 2.66, -10.02], [1.52, 2.42, -9.72], [0.78, 2.38, -9.26]]} radius={0.052} />
    <Conduit name="home-v74-port-floor-service" points={[[-2.62, 0.10, -7.10], [-2.06, 0.18, -8.24], [-1.44, 0.34, -9.18], [-0.48, 0.74, -9.30]]} radius={0.060} color="#2d473e" />
    <Conduit name="home-v74-starboard-floor-service" points={[[2.72, 0.10, -7.06], [2.10, 0.20, -8.20], [1.54, 0.34, -9.14], [0.50, 0.72, -9.28]]} radius={0.060} color="#3b5046" />
  </group>
}

function DustField({ reducedMotion }: { reducedMotion: boolean }) {
  const points = useRef<THREE.Points>(null)
  const geometry = useMemo(() => { const data: number[] = []; for (let index = 0; index < 160; index += 1) { const x = ((index * 37) % 101) / 101 * 11 - 5.5; const y = 0.45 + (((index * 53) % 97) / 97) * 5.0; const z = 4.2 - (((index * 71) % 113) / 113) * 16.0; data.push(x, y, z) } const result = new THREE.BufferGeometry(); result.setAttribute('position', new THREE.Float32BufferAttribute(data, 3)); return result }, [])
  useFrame(({ clock }) => { if (!points.current || reducedMotion) return; points.current.rotation.y = Math.sin(clock.elapsedTime * 0.08) * 0.012 })
  return <points ref={points} geometry={geometry}><pointsMaterial color="#a5b8ad" size={0.018} transparent opacity={0.30} depthWrite={false} /></points>
}

function V74Scene({ reducedMotion }: { reducedMotion: boolean }) {
  const textures = useStoneTextures()
  return <>
    <RuntimeCameraSync reducedMotion={reducedMotion} /><color attach="background" args={['#07100e']} /><fog attach="fog" args={['#07100e', 8.5, 23]} /><Environment files={HOME_HDR} background={false} />
    <ambientLight intensity={0.48} /><hemisphereLight intensity={0.74} color="#b9c9bf" groundColor="#332b21" /><directionalLight position={[-4.2, 6.8, 5.4]} color="#e1c79e" intensity={1.55} castShadow shadow-mapSize-width={768} shadow-mapSize-height={768} /><directionalLight position={[4.0, 3.2, 0.8]} color="#83aa9c" intensity={0.52} />
    <pointLight position={[-3.6, 2.0, -7.8]} color="#d4a267" intensity={1.20} distance={7.0} decay={2} /><pointLight position={[3.7, 2.2, -8.2]} color="#84aea0" intensity={0.92} distance={7.0} decay={2} /><pointLight position={[0, 2.4, -9.2]} color="#d7b176" intensity={0.74} distance={5.8} decay={2} />
    <mesh name="home-v74-continuous-floor" position={[0, -0.12, -2.0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[14.4, 21.0, 40, 52]} /><meshPhysicalMaterial color="#4a4b43" map={textures.color} normalMap={textures.normal} normalScale={new THREE.Vector2(0.48, 0.48)} roughnessMap={textures.arm} roughness={0.90} metalness={0.01} envMapIntensity={0.72} /></mesh>
    <group name="home-v74-photogrammetry-shell" userData={{ construction: 'irregular-photogrammetry-rock-machine-sanctuary' }}>
      <ProductionAsset url={ROCK_FACE_A} name="home-v74-foreground-port-rock" position={[-5.24, 1.52, 1.05]} rotation={[0.18, 0.72, 0.16]} scale={[1.10, 1.46, 0.94]} span={4.6} mode="rock" /><ProductionAsset url={ROCK_FACE_B} name="home-v74-foreground-starboard-rock" position={[5.02, 1.28, 0.24]} rotation={[-0.10, -0.64, -0.12]} scale={[1.08, 1.34, 0.90]} span={4.4} mode="rock" />
      <ProductionAsset url={ROCK_FACE_B} name="home-v74-mid-port-rock" position={[-5.44, 2.18, -4.58]} rotation={[0.08, 1.16, 0.26]} scale={[1.22, 1.62, 0.90]} span={5.3} mode="rock" /><ProductionAsset url={ROCK_FACE_A} name="home-v74-mid-starboard-rock" position={[5.30, 2.34, -5.44]} rotation={[-0.06, -1.02, -0.18]} scale={[1.18, 1.52, 0.94]} span={5.5} mode="rock" />
      <ProductionAsset url={ROCK_FACE_A} name="home-v74-deep-port-apse" position={[-3.84, 2.54, -11.08]} rotation={[0.10, 0.66, 0.10]} scale={[1.16, 1.66, 1.04]} span={4.8} mode="rock" /><ProductionAsset url={ROCK_FACE_B} name="home-v74-deep-starboard-apse" position={[3.92, 2.36, -11.12]} rotation={[-0.12, -0.72, -0.08]} scale={[1.20, 1.58, 1.00]} span={4.9} mode="rock" />
      <ProductionAsset url={ROCK_FACE_B} name="home-v74-overhead-port-mass" position={[-2.84, 5.46, -7.18]} rotation={[1.22, 0.28, -0.34]} scale={[1.28, 1.00, 0.82]} span={4.1} mode="rock" /><ProductionAsset url={ROCK_FACE_A} name="home-v74-overhead-starboard-mass" position={[2.58, 5.70, -8.18]} rotation={[1.38, -0.36, 0.28]} scale={[1.20, 0.96, 0.84]} span={4.2} mode="rock" /><ProductionAsset url={ROCK_FACE_A} name="home-v74-orb-foundation-rock" position={[0.08, 0.14, -10.20]} rotation={[0.02, 0.18, 0.02]} scale={[1.22, 0.56, 0.82]} span={3.3} mode="rock" />
    </group>
    <group name="home-v74-integrated-services">
      <ProductionAsset url={PIPE_SYSTEM} name="home-v74-port-service-manifold" position={[-3.16, 1.36, -8.68]} rotation={[0.08, 0.42, 0.04]} scale={[0.66, 0.80, 0.62]} span={2.0} mode="metal" /><ProductionAsset url={PIPE_SYSTEM} name="home-v74-starboard-service-manifold" position={[3.34, 1.66, -8.96]} rotation={[-0.06, -0.36, -0.04]} scale={[0.62, 0.76, 0.62]} span={1.9} mode="metal" />
      <ProductionAsset url={CAGED_SCONCE} name="home-v74-port-practical" position={[-2.82, 2.70, -9.78]} rotation={[0, 0.28, 0]} span={0.64} mode="light" /><ProductionAsset url={CAGED_SCONCE} name="home-v74-starboard-practical" position={[2.88, 2.44, -9.92]} rotation={[0, -0.26, 0]} span={0.60} mode="light" />
      <TaperedMember name="home-v74-port-midground-load-rib" position={[-3.26, 2.22, -6.82]} rotation={[0.10, -0.14, -0.34]} scale={[0.30, 1.48, 0.42]} color="#33433b" /><TaperedMember name="home-v74-starboard-midground-load-rib" position={[3.54, 2.04, -7.40]} rotation={[-0.08, 0.12, 0.30]} scale={[0.28, 1.36, 0.40]} color="#2d4037" />
      <TaperedMember name="home-v74-port-overhead-service-rib" position={[-1.76, 4.54, -8.28]} rotation={[0.10, 0.16, 1.12]} scale={[0.22, 1.30, 0.36]} color="#455047" /><TaperedMember name="home-v74-starboard-overhead-service-rib" position={[1.94, 4.30, -8.74]} rotation={[-0.08, -0.14, -1.04]} scale={[0.22, 1.24, 0.36]} color="#39473f" />
    </group>
    <RelicMachine /><TrapezoidThreshold name="home-v74-ground-service-threshold" position={[-4.34, 1.32, -10.36]} rotation={[0.02, 0.22, 0.02]} tone="#8cae8f" textures={textures} /><TrapezoidThreshold name="home-v74-life-map-service-threshold" position={[4.38, 1.34, -10.42]} rotation={[-0.02, -0.20, -0.02]} tone="#98a8cf" textures={textures} /><DustField reducedMotion={reducedMotion} />
  </>
}

export function HomeV74RetainedPixelWorld() {
  const [reducedMotion, setReducedMotion] = useState(false)
  useEffect(() => { const mq = window.matchMedia('(prefers-reduced-motion: reduce)'); const apply = () => setReducedMotion(mq.matches); apply(); mq.addEventListener?.('change', apply); return () => mq.removeEventListener?.('change', apply) }, [])
  return <div aria-hidden="true" data-home-v74-retained-pixel-world="photogrammetry-relic-sanctuary" data-home-v74-reduced-motion={reducedMotion ? 'true' : 'false'} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 4, background: '#07100e' }}><Canvas dpr={1} shadows camera={{ position: [0, 1.58, 4.6], fov: 45, near: 0.1, far: 120 }} gl={{ alpha: false, antialias: true, powerPreference: 'high-performance' }} onCreated={({ gl }) => { gl.outputColorSpace = THREE.SRGBColorSpace; gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.46; gl.shadowMap.type = THREE.PCFSoftShadowMap }}><V74Scene reducedMotion={reducedMotion} /></Canvas></div>
}

useGLTF.preload(ROCK_FACE_A); useGLTF.preload(ROCK_FACE_B); useGLTF.preload(PIPE_SYSTEM); useGLTF.preload(CAGED_SCONCE)
