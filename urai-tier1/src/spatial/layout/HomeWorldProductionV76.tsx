'use client'

import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useGLTF, useTexture } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { OrbState } from '@/app/home/orbStateController'

const ROCK_FACE_A = '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_01/asset.gltf'
const ROCK_FACE_B = '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_02/asset.gltf'
const PIPE_SYSTEM = '/assets/urai/home-production/cc0/polyhaven-v48/modular_industrial_pipes_01/asset.gltf'
const CAGED_SCONCE = '/assets/urai/home-production/cc0/polyhaven-v48/industrial_caged_sconce/asset.gltf'
const GOVERNED_ORB = '/assets/urai/generated/models/urai-orb-avatar-v1.glb'

const ROCK_A_DIFFUSE = '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_01/textures/rock_face_01_diff_1k.jpg'
const ROCK_A_NORMAL = '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_01/textures/rock_face_01_nor_gl_1k.jpg'
const ROCK_A_ARM = '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_01/textures/rock_face_01_arm_1k.jpg'
const ROCK_B_DIFFUSE = '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_02/textures/rock_face_02_diff_1k.jpg'
const ROCK_B_NORMAL = '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_02/textures/rock_face_02_nor_gl_1k.jpg'
const ROCK_B_ARM = '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_02/textures/rock_face_02_arm_1k.jpg'

type Vec3 = readonly [number, number, number]
type TextureSet = { color: THREE.Texture; normal: THREE.Texture; arm: THREE.Texture }

type Props = {
  reducedMotion: boolean
  orbState: OrbState
  onOrb: () => void
  onGround: () => void
  onLifeMap: () => void
  onWalk: (event: ThreeEvent<MouseEvent>) => void
}

function useSanctuaryTextures() {
  const sources = useTexture([
    ROCK_A_DIFFUSE,
    ROCK_A_NORMAL,
    ROCK_A_ARM,
    ROCK_B_DIFFUSE,
    ROCK_B_NORMAL,
    ROCK_B_ARM,
  ])

  return useMemo(() => {
    const clone = (source: THREE.Texture, repeat: readonly [number, number], color = false) => {
      const texture = source.clone()
      texture.wrapS = THREE.RepeatWrapping
      texture.wrapT = THREE.RepeatWrapping
      texture.repeat.set(repeat[0], repeat[1])
      texture.anisotropy = 4
      texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace
      texture.needsUpdate = true
      return texture
    }

    return {
      shell: {
        color: clone(sources[0], [3.6, 4.8], true),
        normal: clone(sources[1], [3.6, 4.8]),
        arm: clone(sources[2], [3.6, 4.8]),
      },
      floor: {
        color: clone(sources[3], [2.8, 5.4], true),
        normal: clone(sources[4], [2.8, 5.4]),
        arm: clone(sources[5], [2.8, 5.4]),
      },
    }
  }, [sources])
}

function StoneMaterial({ textures, tint, side = THREE.FrontSide }: { textures: TextureSet; tint: string; side?: THREE.Side }) {
  return <meshPhysicalMaterial
    color={tint}
    map={textures.color}
    normalMap={textures.normal}
    normalScale={new THREE.Vector2(0.62, 0.62)}
    roughnessMap={textures.arm}
    roughness={0.94}
    metalness={0.01}
    envMapIntensity={0.48}
    side={side}
  />
}

function VaultShell({ textures }: { textures: TextureSet }) {
  const geometry = useMemo(() => {
    const xSegments = 28
    const zSegments = 40
    const positions: number[] = []
    const uvs: number[] = []
    const indices: number[] = []

    for (let zIndex = 0; zIndex <= zSegments; zIndex += 1) {
      const tz = zIndex / zSegments
      const z = 6.8 - tz * 20.6
      for (let xIndex = 0; xIndex <= xSegments; xIndex += 1) {
        const tx = xIndex / xSegments
        const x = -6.35 + tx * 12.7
        const arch = Math.cos((x / 6.35) * Math.PI * 0.5)
        const handCut = Math.sin(z * 0.71 + x * 1.13) * 0.075 + Math.cos(z * 1.41 - x * 0.52) * 0.035
        const y = 3.56 + arch * 2.82 + handCut
        positions.push(x, y, z)
        uvs.push(tx * 4.2, tz * 6.8)
      }
    }

    for (let zIndex = 0; zIndex < zSegments; zIndex += 1) {
      for (let xIndex = 0; xIndex < xSegments; xIndex += 1) {
        const a = zIndex * (xSegments + 1) + xIndex
        const b = a + 1
        const c = a + xSegments + 1
        const d = c + 1
        indices.push(a, c, b, b, c, d)
      }
    }

    const result = new THREE.BufferGeometry()
    result.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    result.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    result.setIndex(indices)
    result.computeVertexNormals()
    return result
  }, [])

  return <mesh name="home-v76-continuous-hand-cut-vault" geometry={geometry} receiveShadow castShadow>
    <StoneMaterial textures={textures} tint="#4b4a40" side={THREE.DoubleSide} />
  </mesh>
}

function CantedWall({ side, textures }: { side: 'port' | 'starboard'; textures: TextureSet }) {
  const name = side === 'port' ? 'home-v76-port-canted-bearing-wall' : 'home-v76-starboard-canted-bearing-wall'
  const geometry = useMemo(() => {
    const ySegments = 14
    const zSegments = 40
    const sign = side === 'port' ? -1 : 1
    const positions: number[] = []
    const uvs: number[] = []
    const indices: number[] = []

    for (let zIndex = 0; zIndex <= zSegments; zIndex += 1) {
      const tz = zIndex / zSegments
      const z = 6.8 - tz * 20.6
      for (let yIndex = 0; yIndex <= ySegments; yIndex += 1) {
        const ty = yIndex / ySegments
        const y = -0.18 + ty * 4.18
        const inwardCant = 6.28 - ty * 0.54
        const asymmetry = side === 'port'
          ? Math.sin(z * 0.54 + ty * 2.8) * 0.12
          : Math.cos(z * 0.63 - ty * 2.1) * 0.09
        positions.push(sign * (inwardCant + asymmetry), y, z)
        uvs.push(tz * 6.8, ty * 2.5)
      }
    }

    for (let zIndex = 0; zIndex < zSegments; zIndex += 1) {
      for (let yIndex = 0; yIndex < ySegments; yIndex += 1) {
        const a = zIndex * (ySegments + 1) + yIndex
        const b = a + 1
        const c = a + ySegments + 1
        const d = c + 1
        if (side === 'port') indices.push(a, b, c, b, d, c)
        else indices.push(a, c, b, b, c, d)
      }
    }

    const result = new THREE.BufferGeometry()
    result.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    result.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    result.setIndex(indices)
    result.computeVertexNormals()
    return result
  }, [side])

  return <mesh name={name} geometry={geometry} receiveShadow castShadow>
    <StoneMaterial textures={textures} tint={side === 'port' ? '#514e42' : '#3d463f'} side={THREE.DoubleSide} />
  </mesh>
}

function DeepApse({ textures }: { textures: TextureSet }) {
  const geometry = useMemo(() => {
    const xSegments = 32
    const ySegments = 20
    const positions: number[] = []
    const uvs: number[] = []
    const indices: number[] = []

    for (let yIndex = 0; yIndex <= ySegments; yIndex += 1) {
      const ty = yIndex / ySegments
      const y = -0.16 + ty * 6.54
      for (let xIndex = 0; xIndex <= xSegments; xIndex += 1) {
        const tx = xIndex / xSegments
        const x = -6.2 + tx * 12.4
        const recess = Math.cos((x / 6.2) * Math.PI * 0.5)
        const relief = Math.sin(x * 1.37 + y * 0.61) * 0.055 + Math.cos(y * 1.22 - x * 0.38) * 0.03
        const z = -10.7 - recess * 2.72 + relief
        positions.push(x, y, z)
        uvs.push(tx * 4.4, ty * 3.6)
      }
    }

    for (let yIndex = 0; yIndex < ySegments; yIndex += 1) {
      for (let xIndex = 0; xIndex < xSegments; xIndex += 1) {
        const a = yIndex * (xSegments + 1) + xIndex
        const b = a + 1
        const c = a + xSegments + 1
        const d = c + 1
        indices.push(a, b, c, b, d, c)
      }
    }

    const result = new THREE.BufferGeometry()
    result.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    result.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    result.setIndex(indices)
    result.computeVertexNormals()
    return result
  }, [])

  return <mesh name="home-v76-deep-concave-apse" geometry={geometry} receiveShadow castShadow>
    <StoneMaterial textures={textures} tint="#504d42" side={THREE.DoubleSide} />
  </mesh>
}

function prepareAsset(source: THREE.Object3D, span: number, mode: 'rock' | 'metal' | 'light') {
  const root = source.clone(true)
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    const originals = Array.isArray(object.material) ? object.material : [object.material]
    const materials = originals.map((entry) => {
      const clone = entry.clone()
      if (clone instanceof THREE.MeshStandardMaterial) {
        clone.roughness = mode === 'rock' ? Math.max(clone.roughness, 0.86) : Math.max(clone.roughness, 0.46)
        clone.metalness = mode === 'rock' ? 0.01 : Math.min(Math.max(clone.metalness, 0.24), 0.62)
        clone.envMapIntensity = mode === 'rock' ? 0.48 : 0.72
        if ('transmission' in clone) (clone as THREE.MeshPhysicalMaterial).transmission = 0
      }
      return clone
    })
    object.material = Array.isArray(object.material) ? materials : materials[0]
    object.castShadow = true
    object.receiveShadow = true
  })
  const box = new THREE.Box3().setFromObject(root)
  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())
  const scalar = span / Math.max(size.x, size.y, size.z, 0.001)
  root.scale.setScalar(scalar)
  root.position.copy(center).multiplyScalar(-scalar)
  return root
}

function ProductionAsset({ url, name, position, rotation = [0, 0, 0], scale = [1, 1, 1], span, mode }: { url: string; name: string; position: Vec3; rotation?: Vec3; scale?: Vec3; span: number; mode: 'rock' | 'metal' | 'light' }) {
  const gltf = useGLTF(url)
  const model = useMemo(() => prepareAsset(gltf.scene, span, mode), [gltf.scene, mode, span])
  return <group
    name={name}
    position={position as [number, number, number]}
    rotation={rotation as [number, number, number]}
    scale={scale as [number, number, number]}
    userData={{ runtimeAsset: url, provenance: 'poly-haven-cc0-committed', visibleProductionAsset: true }}
  >
    <primitive object={model} />
  </group>
}

function ExtrudedBody({ name, points, position, rotation = [0, 0, 0], scale = [1, 1, 1], depth = 0.54, color = '#34463f', metalness = 0.38, roughness = 0.56 }: { name: string; points: readonly (readonly [number, number])[]; position: Vec3; rotation?: Vec3; scale?: Vec3; depth?: number; color?: string; metalness?: number; roughness?: number }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(points[0][0], points[0][1])
    for (const [x, y] of points.slice(1)) shape.lineTo(x, y)
    shape.closePath()
    const result = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelSegments: 6,
      bevelSize: 0.105,
      bevelThickness: 0.105,
      curveSegments: 14,
      steps: 1,
    })
    result.center()
    result.computeVertexNormals()
    return result
  }, [depth, points])

  return <mesh name={name} geometry={geometry} position={position as [number, number, number]} rotation={rotation as [number, number, number]} scale={scale as [number, number, number]} castShadow receiveShadow>
    <meshPhysicalMaterial color={color} roughness={roughness} metalness={metalness} clearcoat={0.08} clearcoatRoughness={0.66} envMapIntensity={0.72} side={THREE.DoubleSide} />
  </mesh>
}

function useCurvedArmorGeometry(side: 'port' | 'starboard') {
  return useMemo(() => {
    const sign = side === 'port' ? -1 : 1
    const shape = new THREE.Shape()
    shape.moveTo(sign * 0.15, -1.54)
    shape.bezierCurveTo(sign * 0.72, -1.50, sign * 1.28, -1.02, sign * 1.36, -0.28)
    shape.bezierCurveTo(sign * 1.46, 0.62, sign * 0.92, 1.48, sign * 0.24, 1.77)
    shape.lineTo(sign * 0.12, 0.98)
    shape.bezierCurveTo(sign * 0.58, 0.62, sign * 0.70, -0.08, sign * 0.52, -0.72)
    shape.bezierCurveTo(sign * 0.42, -1.10, sign * 0.27, -1.34, sign * 0.15, -1.54)
    shape.closePath()
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.78,
      bevelEnabled: true,
      bevelSegments: 8,
      bevelSize: 0.12,
      bevelThickness: 0.12,
      curveSegments: 24,
      steps: 2,
    })
    geometry.center()
    geometry.computeVertexNormals()
    return geometry
  }, [side])
}

function useVerticalApertureGeometry() {
  return useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-0.12, -1.05)
    shape.bezierCurveTo(-0.28, -0.82, -0.29, 0.78, -0.10, 1.08)
    shape.bezierCurveTo(0, 1.22, 0.10, 1.08, 0.10, 1.08)
    shape.bezierCurveTo(0.29, 0.78, 0.28, -0.82, 0.12, -1.05)
    shape.bezierCurveTo(0.03, -1.18, -0.03, -1.18, -0.12, -1.05)
    shape.closePath()
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.10, bevelEnabled: true, bevelSegments: 4, bevelSize: 0.035, bevelThickness: 0.035, curveSegments: 24 })
    geometry.center()
    return geometry
  }, [])
}

function Conduit({ name, points, radius = 0.07, color = '#45584f' }: { name: string; points: Vec3[]; radius?: number; color?: string }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)), false, 'centripetal'), [points])
  return <mesh name={name} castShadow receiveShadow>
    <tubeGeometry args={[curve, 32, radius, 10, false]} />
    <meshPhysicalMaterial color={color} roughness={0.42} metalness={0.58} envMapIntensity={0.76} />
  </mesh>
}

function BearingRib({ z, skew, textures }: { z: number; skew: number; textures: TextureSet }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(-5.82, 3.34, z + skew),
    new THREE.Vector3(-3.2, 5.45, z),
    new THREE.Vector3(0, 6.18, z - skew * 0.3),
    new THREE.Vector3(3.25, 5.38, z),
    new THREE.Vector3(5.82, 3.34, z - skew),
  ], false, 'centripetal'), [skew, z])

  return <mesh name={`home-v76-bearing-rib-${Math.abs(z).toFixed(1)}`} castShadow receiveShadow>
    <tubeGeometry args={[curve, 44, 0.145, 8, false]} />
    <StoneMaterial textures={textures} tint="#5d594b" />
  </mesh>
}

const PORTAL_PORT_CHEEK = [[-1.22, -1.42], [-0.72, -1.30], [-0.58, 0.82], [-0.16, 1.50], [-0.72, 1.68], [-1.26, 1.06]] as const
const PORTAL_STARBOARD_CHEEK = PORTAL_PORT_CHEEK.map(([x, y]) => [-x, y] as const)
const PORTAL_THRESHOLD = [[-1.14, -0.30], [1.10, -0.30], [0.94, 0.26], [-0.84, 0.34]] as const

function PortalRecess({ destination, position, rotation, onActivate }: { destination: 'ground' | 'life-map'; position: Vec3; rotation: Vec3; onActivate: () => void }) {
  const tone = destination === 'ground' ? '#b6c98c' : '#9fb3da'
  const shadow = destination === 'ground' ? '#101813' : '#10131c'
  const field = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-0.68, -1.22)
    shape.lineTo(0.68, -1.22)
    shape.lineTo(0.56, 0.72)
    shape.lineTo(0.22, 1.22)
    shape.lineTo(-0.22, 1.22)
    shape.lineTo(-0.56, 0.72)
    shape.closePath()
    return shape
  }, [])
  return <group
    name={destination === 'ground' ? 'home-ground-environmental-threshold' : 'home-life-map-sky-lookout'}
    position={position as [number, number, number]}
    rotation={rotation as [number, number, number]}
    userData={{ destination, treatment: 'v76-integrated-trapezoid-service-recess', governedPortalIdentity: 'portal-ring-master-v1.glb' }}
  >
    <group name={destination === 'life-map' ? 'home-life-map-physical-portal' : 'home-ground-physical-threshold'} />
    <mesh name={`home-v76-${destination}-recess-field`} position={[0, 1.55, -0.32]} onClick={(event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onActivate() }}>
      <shapeGeometry args={[field]} />
      <meshPhysicalMaterial color={shadow} emissive={tone} emissiveIntensity={0.06} roughness={0.42} metalness={0.24} side={THREE.DoubleSide} />
    </mesh>
    <ExtrudedBody name={`home-v76-${destination}-port-cheek`} points={PORTAL_PORT_CHEEK} position={[0, 1.54, 0]} color="#4b554b" metalness={0.10} roughness={0.78} depth={0.58} />
    <ExtrudedBody name={`home-v76-${destination}-starboard-cheek`} points={PORTAL_STARBOARD_CHEEK} position={[0, 1.54, 0]} color="#38443d" metalness={0.12} roughness={0.76} depth={0.58} />
    <ExtrudedBody name={`home-v76-${destination}-threshold`} points={PORTAL_THRESHOLD} position={[0, 0.34, 0.08]} rotation={[-Math.PI / 2, 0, 0]} color="#39443d" metalness={0.18} roughness={0.70} depth={0.34} />
    <Conduit name={`home-v76-${destination}-luminous-service-seam`} points={[
      [-0.56, 0.35, 0.34],
      [-0.62, 1.46, 0.34],
      [-0.40, 2.52, 0.34],
      [0, 2.78, 0.34],
    ]} radius={0.025} color={tone} />
    <mesh position={[0, 1.52, 0.24]} onClick={(event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onActivate() }}>
      <boxGeometry args={[1.62, 2.72, 0.08]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
    <pointLight position={[0, 1.66, 0.72]} color={tone} intensity={0.92} distance={4.8} decay={2} />
  </group>
}

function RelicMachine({ state, reducedMotion, onOpen }: { state: OrbState; reducedMotion: boolean; onOpen: () => void }) {
  const apertureMaterial = useRef<THREE.MeshPhysicalMaterial>(null)
  const portArmor = useCurvedArmorGeometry('port')
  const starboardArmor = useCurvedArmorGeometry('starboard')
  const aperture = useVerticalApertureGeometry()

  useFrame(({ clock }) => {
    if (apertureMaterial.current) {
      const active = state === 'dormant' ? 0.72 : state === 'warning' ? 1.52 : 1.12
      apertureMaterial.current.emissiveIntensity = reducedMotion ? active : active + Math.sin(clock.elapsedTime * 0.72) * 0.12
    }
  })

  return <group
    name="home-v76-apse-embedded-orb-relic-machine"
    onClick={(event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onOpen() }}
    userData={{
      treatment: 'v76-curved-load-bearing-relic-machine',
      governedOrbIdentity: GOVERNED_ORB,
      orbState: state,
      noSphere: true,
      noCage: true,
      connectedLoadPaths: true,
    }}
  >
    <ExtrudedBody name="home-v76-machine-rear-bearing-plate" points={[
      [-2.0, -2.08], [2.02, -2.08], [2.28, 1.10], [1.18, 2.12], [-1.36, 2.04], [-2.24, 0.94],
    ]} position={[0, 2.45, -11.55]} depth={0.72} color="#24332e" metalness={0.30} roughness={0.62} />
    <mesh name="home-v76-port-curved-armor" geometry={portArmor} position={[0, 2.46, -10.88]} rotation={[0.015, -0.06, -0.025]} scale={[1.04, 1.08, 1.06]} castShadow receiveShadow>
      <meshPhysicalMaterial color="#315346" roughness={0.48} metalness={0.42} clearcoat={0.12} clearcoatRoughness={0.58} envMapIntensity={0.82} side={THREE.DoubleSide} />
    </mesh>
    <mesh name="home-v76-starboard-curved-armor" geometry={starboardArmor} position={[0, 2.42, -10.84]} rotation={[-0.012, 0.06, 0.02]} scale={[1.03, 1.06, 1.08]} castShadow receiveShadow>
      <meshPhysicalMaterial color="#466157" roughness={0.50} metalness={0.38} clearcoat={0.10} clearcoatRoughness={0.62} envMapIntensity={0.80} side={THREE.DoubleSide} />
    </mesh>
    <mesh name="home-v76-machine-aperture-recess" geometry={aperture} position={[0, 2.45, -10.32]} scale={[1.82, 1.34, 1.0]} castShadow>
      <meshPhysicalMaterial color="#06110e" roughness={0.30} metalness={0.54} envMapIntensity={0.42} />
    </mesh>
    <mesh name="home-v76-machine-vertical-aperture" geometry={aperture} position={[0, 2.45, -10.18]} scale={[0.34, 1.05, 0.48]}>
      <meshPhysicalMaterial ref={apertureMaterial} color="#f4ddb4" emissive="#d5a45d" emissiveIntensity={1.12} roughness={0.16} metalness={0.04} clearcoat={0.28} toneMapped={false} />
    </mesh>
    <ExtrudedBody name="home-v76-machine-floor-cradle" points={[
      [-2.02, -0.72], [2.08, -0.72], [1.56, 0.62], [0.72, 0.92], [-0.84, 0.86], [-1.70, 0.48],
    ]} position={[0, 0.22, -10.46]} rotation={[-Math.PI / 2, 0, 0]} depth={0.36} color="#2e4139" metalness={0.32} roughness={0.60} />
    <ExtrudedBody name="home-v76-machine-crown-crosshead" points={[
      [-1.90, -0.28], [1.88, -0.24], [1.54, 0.34], [0.62, 0.54], [-0.72, 0.50], [-1.64, 0.28],
    ]} position={[0, 4.78, -11.02]} depth={0.66} color="#4c5b52" metalness={0.40} roughness={0.52} />
    <Conduit name="home-v76-port-apse-load-feed" points={[
      [-3.74, 1.18, -11.16], [-2.88, 1.42, -11.36], [-2.02, 2.08, -11.28], [-1.22, 2.72, -10.94],
    ]} radius={0.09} color="#53645a" />
    <Conduit name="home-v76-starboard-apse-load-feed" points={[
      [3.72, 1.26, -11.12], [2.86, 1.54, -11.34], [2.04, 2.16, -11.26], [1.20, 2.64, -10.90],
    ]} radius={0.085} color="#40564c" />
    <Conduit name="home-v76-port-floor-keel-feed" points={[
      [-2.54, 0.10, -8.76], [-2.12, 0.12, -9.42], [-1.62, 0.18, -10.02], [-1.04, 0.30, -10.42],
    ]} radius={0.065} color="#3d5047" />
    <Conduit name="home-v76-starboard-floor-keel-feed" points={[
      [2.66, 0.10, -8.82], [2.18, 0.13, -9.48], [1.64, 0.18, -10.06], [1.06, 0.30, -10.42],
    ]} radius={0.065} color="#4c5d53" />
    <mesh name="home-v76-orb-interaction-volume" position={[0, 2.42, -10.40]}>
      <boxGeometry args={[3.24, 4.38, 1.36]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
    <pointLight position={[0, 2.48, -9.74]} color="#a9d0c0" intensity={state === 'dormant' ? 0.58 : 1.12} distance={5.8} decay={2} />
    <pointLight position={[-0.62, 4.04, -10.10]} color="#d8aa6b" intensity={0.62} distance={4.2} decay={2} />
  </group>
}

function DustField({ reducedMotion }: { reducedMotion: boolean }) {
  const points = useRef<THREE.Points>(null)
  const geometry = useMemo(() => {
    const positions: number[] = []
    for (let index = 0; index < 84; index += 1) {
      const x = ((index * 37) % 101) / 101 * 10.8 - 5.4
      const y = 0.42 + (((index * 53) % 97) / 97) * 5.2
      const z = 5.4 - (((index * 71) % 113) / 113) * 17.8
      positions.push(x, y, z)
    }
    const result = new THREE.BufferGeometry()
    result.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    return result
  }, [])

  useFrame(({ clock }) => {
    if (!points.current || reducedMotion) return
    points.current.rotation.y = Math.sin(clock.elapsedTime * 0.06) * 0.006
  })

  return <points ref={points} geometry={geometry}>
    <pointsMaterial color="#d6c8a8" size={0.018} transparent opacity={0.28} depthWrite={false} />
  </points>
}

export function HomeV76Sanctuary({ reducedMotion, orbState, onOrb, onGround, onLifeMap, onWalk }: Props) {
  const textures = useSanctuaryTextures()
  return <group
    name="home-v76-single-canvas-retained-pixel-sanctuary"
    userData={{
      visualOwner: 'v76-single-canvas-deep-apse-sanctuary',
      construction: 'continuous-photogrammetry-shell-curved-load-bearing-relic-machine',
      retainedPixelStatus: 'candidate-not-certified',
    }}
  >
    <mesh name="home-v76-continuous-stone-floor" position={[0, -0.14, -2.8]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[12.7, 20.4, 42, 58]} />
      <StoneMaterial textures={textures.floor} tint="#504b3f" />
    </mesh>
    <mesh name="home-walkable-navigation-surface" position={[0, 0.065, -2.0]} rotation={[-Math.PI / 2, 0, 0]} onClick={onWalk}>
      <planeGeometry args={[12.4, 18.8]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
    </mesh>

    <VaultShell textures={textures.shell} />
    <CantedWall side="port" textures={textures.shell} />
    <CantedWall side="starboard" textures={textures.shell} />
    <DeepApse textures={textures.shell} />
    <BearingRib z={-3.8} skew={0.18} textures={textures.shell} />
    <BearingRib z={-9.55} skew={-0.16} textures={textures.shell} />

    <ProductionAsset url={ROCK_FACE_A} name="home-v76-port-foreground-embedded-rock" position={[-5.66, 1.74, 1.15]} rotation={[0.06, 0.56, -0.08]} scale={[1.05, 1.38, 0.90]} span={3.46} mode="rock" />
    <ProductionAsset url={ROCK_FACE_B} name="home-v76-starboard-midground-embedded-rock" position={[5.72, 1.56, -2.05]} rotation={[-0.04, -0.48, 0.06]} scale={[0.96, 1.26, 0.88]} span={3.30} mode="rock" />
    <ProductionAsset url={ROCK_FACE_B} name="home-v76-port-apse-foundation" position={[-4.76, 1.28, -11.02]} rotation={[-0.04, 0.44, -0.08]} scale={[1.04, 1.34, 0.96]} span={3.42} mode="rock" />
    <ProductionAsset url={ROCK_FACE_A} name="home-v76-starboard-apse-foundation" position={[4.84, 1.46, -11.14]} rotation={[0.02, -0.38, 0.06]} scale={[0.96, 1.42, 0.92]} span={3.54} mode="rock" />

    <PortalRecess destination="ground" position={[-4.48, 0.05, -8.92]} rotation={[0, 0.28, 0]} onActivate={onGround} />
    <PortalRecess destination="life-map" position={[4.48, 0.05, -9.28]} rotation={[0, -0.28, 0]} onActivate={onLifeMap} />
    <ProductionAsset url={CAGED_SCONCE} name="home-v76-port-caged-practical" position={[-3.28, 3.20, -9.82]} rotation={[0, 0.16, 0]} span={0.62} mode="light" />
    <ProductionAsset url={CAGED_SCONCE} name="home-v76-starboard-caged-practical" position={[3.34, 3.08, -10.02]} rotation={[0, -0.14, 0]} span={0.58} mode="light" />
    <ProductionAsset url={PIPE_SYSTEM} name="home-v76-port-integrated-service-manifold" position={[-3.38, 1.26, -11.16]} rotation={[0.04, 0.36, 0.02]} scale={[0.58, 0.72, 0.58]} span={1.78} mode="metal" />
    <ProductionAsset url={PIPE_SYSTEM} name="home-v76-starboard-integrated-service-manifold" position={[3.44, 1.34, -11.22]} rotation={[-0.03, -0.34, -0.02]} scale={[0.56, 0.68, 0.56]} span={1.72} mode="metal" />

    <RelicMachine state={orbState} reducedMotion={reducedMotion} onOpen={onOrb} />
    <DustField reducedMotion={reducedMotion} />

    <pointLight position={[-4.18, 2.18, -6.72]} color="#d7a565" intensity={0.76} distance={7.0} decay={2} />
    <pointLight position={[4.10, 2.32, -7.62]} color="#83aaa0" intensity={0.62} distance={7.2} decay={2} />
    <spotLight position={[-1.8, 5.92, -3.2]} target-position={[0, 2.30, -10.4]} angle={0.34} penumbra={0.82} intensity={0.86} color="#e1c28f" distance={15} decay={2} castShadow shadow-mapSize-width={512} shadow-mapSize-height={512} />
  </group>
}

useGLTF.preload(ROCK_FACE_A)
useGLTF.preload(ROCK_FACE_B)
useGLTF.preload(PIPE_SYSTEM)
useGLTF.preload(CAGED_SCONCE)
useTexture.preload([ROCK_A_DIFFUSE, ROCK_A_NORMAL, ROCK_A_ARM, ROCK_B_DIFFUSE, ROCK_B_NORMAL, ROCK_B_ARM])
