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
        if (mode === 'rock') clone.color.multiplyScalar(0.44)
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
    const points = side === 'port'
      ? [[-0.14, -1.56], [-1.02, -1.28], [-1.48, -0.58], [-1.22, 0.08], [-1.58, 0.68], [-0.82, 1.62], [-0.24, 1.34], [-0.46, 0.46], [-0.20, -0.28]]
      : [[0.10, -1.18], [0.62, -1.44], [1.28, -0.82], [1.10, -0.12], [1.42, 0.38], [0.94, 1.18], [0.28, 1.52], [0.42, 0.52], [0.18, -0.22]]
    const shape = new THREE.Shape()
    shape.moveTo(points[0][0], points[0][1])
    for (const [x, y] of points.slice(1)) shape.lineTo(x, y)
    shape.closePath()
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: side === 'port' ? 0.62 : 0.46,
      bevelEnabled: true,
      bevelSegments: 3,
      bevelSize: 0.07,
      bevelThickness: 0.07,
      curveSegments: 8,
      steps: 1,
    })
    geometry.center()
    geometry.computeVertexNormals()
    return geometry
  }, [side])
}

function useVerticalApertureGeometry() {
  return useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-0.30, -0.92)
    shape.lineTo(0.08, -1.12)
    shape.lineTo(0.28, -0.46)
    shape.lineTo(0.08, -0.12)
    shape.lineTo(0.34, 0.48)
    shape.lineTo(-0.04, 1.08)
    shape.lineTo(-0.26, 0.34)
    shape.lineTo(-0.08, -0.18)
    shape.closePath()
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.10, bevelEnabled: true, bevelSegments: 2, bevelSize: 0.028, bevelThickness: 0.028, curveSegments: 8 })
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

const PORTAL_PORT_CHEEK = [[-1.26, -1.36], [-0.72, -1.28], [-0.52, 0.42], [-0.10, 1.42], [-0.48, 1.72], [-1.14, 0.76]] as const
const PORTAL_STARBOARD_CHEEK = [[0.24, -1.18], [0.84, -1.02], [1.10, 0.18], [0.62, 1.22], [0.18, 0.82]] as const
const PORTAL_THRESHOLD = [[-1.16, -0.24], [1.04, -0.38], [0.72, 0.18], [-0.92, 0.34]] as const

const ORB_MEMORY_SHARDS = [
  { id: 'crown', points: [[-0.34, -0.34], [0.28, -0.46], [0.52, 0.18], [-0.08, 0.62]], position: [-0.34, 3.40, -10.04], rotation: [0.02, -0.08, -0.24], scale: [0.72, 0.72, 0.72], color: '#725f48' },
  { id: 'port', points: [[-0.46, -0.50], [0.18, -0.34], [0.34, 0.34], [-0.30, 0.48]], position: [-0.92, 2.56, -10.02], rotation: [-0.04, 0.12, 0.16], scale: [0.86, 0.86, 0.86], color: '#3b4e45' },
  { id: 'keel', points: [[-0.26, -0.54], [0.36, -0.38], [0.18, 0.52], [-0.42, 0.20]], position: [-0.18, 1.64, -10.00], rotation: [0.03, -0.12, -0.08], scale: [0.78, 0.78, 0.78], color: '#584a3d' },
  { id: 'starboard', points: [[-0.28, -0.36], [0.44, -0.48], [0.30, 0.42], [-0.18, 0.54]], position: [0.58, 2.82, -10.12], rotation: [-0.02, 0.10, 0.26], scale: [0.70, 0.70, 0.70], color: '#46584d' },
  { id: 'inner', points: [[-0.24, -0.42], [0.32, -0.26], [0.20, 0.36], [-0.30, 0.28]], position: [-0.18, 2.62, -9.86], rotation: [0.02, -0.04, 0.08], scale: [0.62, 0.62, 0.62], color: '#836d4e' },
  { id: 'wake', points: [[-0.36, -0.22], [0.30, -0.42], [0.46, 0.18], [-0.20, 0.40]], position: [0.34, 2.04, -10.08], rotation: [-0.03, 0.14, -0.18], scale: [0.68, 0.68, 0.68], color: '#32483f' },
] as const

function PortalRecess({ destination, position, rotation, onActivate }: { destination: 'ground' | 'life-map'; position: Vec3; rotation: Vec3; onActivate: () => void }) {
  const tone = destination === 'ground' ? '#b6c98c' : '#9fb3da'
  const shadow = destination === 'ground' ? '#101813' : '#10131c'
  const field = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-0.72, -1.18)
    shape.lineTo(0.54, -1.28)
    shape.lineTo(0.72, 0.36)
    shape.lineTo(0.18, 1.20)
    shape.lineTo(-0.34, 1.06)
    shape.lineTo(-0.60, 0.34)
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
    <mesh name={`home-v76-${destination}-recess-field`} position={[0, 1.46, -0.48]} rotation={[0, 0, destination === 'ground' ? -0.08 : 0.12]} onClick={(event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onActivate() }}>
      <shapeGeometry args={[field]} />
      <meshPhysicalMaterial color={shadow} emissive={tone} emissiveIntensity={0.025} roughness={0.62} metalness={0.12} side={THREE.DoubleSide} />
    </mesh>
    <ExtrudedBody name={`home-v76-${destination}-port-cheek`} points={PORTAL_PORT_CHEEK} position={[-0.16, 1.42, -0.18]} rotation={[0.02, 0.02, -0.07]} scale={[1.0, 0.92, 1]} color="#332f28" metalness={0.05} roughness={0.88} depth={0.42} />
    <ExtrudedBody name={`home-v76-${destination}-starboard-cheek`} points={PORTAL_STARBOARD_CHEEK} position={[0.24, 1.36, -0.26]} rotation={[-0.02, -0.04, 0.10]} scale={[0.78, 0.72, 1]} color="#29322d" metalness={0.08} roughness={0.84} depth={0.34} />
    <ExtrudedBody name={`home-v76-${destination}-threshold`} points={PORTAL_THRESHOLD} position={[-0.08, 0.20, -0.04]} rotation={[-Math.PI / 2, 0.08, -0.04]} scale={[0.92, 0.92, 0.92]} color="#302f29" metalness={0.10} roughness={0.82} depth={0.20} />
    <Conduit name={`home-v76-${destination}-luminous-service-seam`} points={[
      [-0.72, 0.28, 0.12],
      [-0.64, 1.24, 0.10],
      [-0.34, 2.34, 0.08],
      [0.12, 2.62, 0.04],
    ]} radius={0.018} color={tone} />
    <mesh position={[0, 1.42, 0.10]} onClick={(event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onActivate() }}>
      <boxGeometry args={[1.56, 2.62, 0.08]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
    <pointLight position={[-0.18, 1.54, 0.48]} color={tone} intensity={0.46} distance={3.8} decay={2} />
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
      [-2.22, -1.84], [1.62, -2.12], [2.34, -0.46], [1.74, 1.46], [0.62, 2.18], [-1.54, 1.82], [-2.46, 0.42],
    ]} position={[-0.42, 2.46, -11.72]} rotation={[0.02, -0.02, -0.035]} scale={[1.08, 1.04, 1]} depth={0.46} color="#1f2824" metalness={0.16} roughness={0.78} />
    <mesh name="home-v76-port-curved-armor" geometry={portArmor} position={[-0.56, 2.50, -10.98]} rotation={[0.04, -0.12, -0.12]} scale={[1.08, 1.02, 1.0]} castShadow receiveShadow>
      <meshPhysicalMaterial color="#493f34" roughness={0.76} metalness={0.18} clearcoat={0.02} clearcoatRoughness={0.88} envMapIntensity={0.54} side={THREE.DoubleSide} />
    </mesh>
    <mesh name="home-v76-starboard-curved-armor" geometry={starboardArmor} position={[0.34, 2.24, -10.92]} rotation={[-0.03, 0.16, 0.17]} scale={[0.88, 0.92, 0.96]} castShadow receiveShadow>
      <meshPhysicalMaterial color="#2d3c35" roughness={0.72} metalness={0.22} clearcoat={0.03} clearcoatRoughness={0.84} envMapIntensity={0.56} side={THREE.DoubleSide} />
    </mesh>
    <mesh name="home-v76-machine-aperture-recess" geometry={aperture} position={[-0.18, 2.56, -10.24]} rotation={[0.02, -0.04, -0.10]} scale={[0.92, 0.86, 0.72]} castShadow>
      <meshPhysicalMaterial color="#0b100e" roughness={0.68} metalness={0.24} envMapIntensity={0.32} />
    </mesh>
    <mesh name="home-v76-machine-vertical-aperture" geometry={aperture} position={[-0.16, 2.56, -10.12]} rotation={[0.02, -0.04, -0.10]} scale={[0.18, 0.62, 0.36]}>
      <meshPhysicalMaterial ref={apertureMaterial} color="#d8bd86" emissive="#b0783d" emissiveIntensity={1.0} roughness={0.38} metalness={0.05} clearcoat={0.04} toneMapped={false} />
    </mesh>
    {ORB_MEMORY_SHARDS.map((shard) => <ExtrudedBody
      key={shard.id}
      name={`home-v77-orb-memory-shard-${shard.id}`}
      points={shard.points}
      position={shard.position}
      rotation={shard.rotation}
      scale={shard.scale}
      depth={0.22}
      color={shard.color}
      metalness={0.20}
      roughness={0.72}
    />)}
    <ExtrudedBody name="home-v76-machine-floor-cradle" points={[
      [-2.34, -0.62], [1.72, -0.84], [2.10, 0.10], [0.82, 0.54], [-0.58, 0.40], [-1.92, 0.68],
    ]} position={[-0.28, 0.01, -10.48]} rotation={[-Math.PI / 2, 0.08, -0.03]} scale={[1.04, 1, 1]} depth={0.18} color="#2b302a" metalness={0.12} roughness={0.82} />
    <ExtrudedBody name="home-v76-machine-crown-crosshead" points={[
      [-2.02, -0.30], [1.54, -0.42], [1.88, 0.06], [0.68, 0.48], [-0.84, 0.38], [-1.72, 0.56],
    ]} position={[-0.48, 4.62, -11.10]} rotation={[0.02, -0.05, -0.09]} depth={0.38} color="#403b31" metalness={0.18} roughness={0.76} />
    <ExtrudedBody name="home-v77-port-apse-coupling" points={[
      [-1.34, -0.58], [0.84, -0.82], [1.18, 0.24], [0.14, 0.72], [-1.08, 0.48],
    ]} position={[-2.42, 2.10, -11.36]} rotation={[0.02, 0.10, 0.22]} depth={0.34} color="#353129" metalness={0.10} roughness={0.84} />
    <ExtrudedBody name="home-v77-starboard-apse-coupling" points={[
      [-0.86, -0.42], [1.18, -0.64], [1.42, 0.18], [0.32, 0.58], [-0.68, 0.42],
    ]} position={[2.10, 1.62, -11.46]} rotation={[-0.02, -0.12, -0.16]} scale={[0.86, 0.86, 1]} depth={0.28} color="#29352f" metalness={0.12} roughness={0.82} />
    <Conduit name="home-v76-port-apse-load-feed" points={[
      [-4.28, 0.82, -11.44], [-3.54, 1.08, -11.54], [-2.74, 1.72, -11.42], [-1.38, 2.88, -11.04],
    ]} radius={0.075} color="#493f34" />
    <Conduit name="home-v76-starboard-apse-load-feed" points={[
      [4.10, 1.78, -11.32], [3.18, 1.62, -11.48], [2.42, 2.14, -11.34], [0.98, 2.30, -10.98],
    ]} radius={0.065} color="#33443b" />
    <Conduit name="home-v76-port-floor-keel-feed" points={[
      [-3.14, 0.04, -8.42], [-2.62, 0.05, -9.06], [-1.84, 0.08, -9.88], [-0.92, 0.12, -10.36],
    ]} radius={0.055} color="#3b433a" />
    <Conduit name="home-v76-starboard-floor-keel-feed" points={[
      [2.82, 0.04, -9.18], [2.20, 0.06, -9.68], [1.44, 0.10, -10.06], [0.82, 0.16, -10.34],
    ]} radius={0.045} color="#465047" />
    <mesh name="home-v76-orb-interaction-volume" position={[-0.18, 2.42, -10.40]}>
      <boxGeometry args={[3.62, 4.12, 1.48]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
    <pointLight position={[-0.26, 2.54, -9.72]} color="#c9aa76" intensity={state === 'dormant' ? 0.34 : 0.72} distance={4.8} decay={2} />
    <pointLight position={[-1.52, 3.92, -10.10]} color="#d29a58" intensity={0.48} distance={4.0} decay={2} />
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

    <ProductionAsset url={ROCK_FACE_A} name="home-v76-port-foreground-embedded-rock" position={[-6.02, 1.28, 0.38]} rotation={[0.08, 0.82, -0.12]} scale={[1.18, 1.42, 0.96]} span={3.72} mode="rock" />
    <ProductionAsset url={ROCK_FACE_B} name="home-v76-starboard-midground-embedded-rock" position={[6.08, 1.18, -3.18]} rotation={[-0.08, -0.76, 0.10]} scale={[1.10, 1.34, 0.94]} span={3.64} mode="rock" />
    <ProductionAsset url={ROCK_FACE_B} name="home-v76-port-apse-foundation" position={[-5.52, 1.20, -11.66]} rotation={[-0.06, 0.76, -0.10]} scale={[1.20, 1.46, 1.02]} span={3.86} mode="rock" />
    <ProductionAsset url={ROCK_FACE_A} name="home-v76-starboard-apse-foundation" position={[5.76, 1.12, -11.82]} rotation={[0.04, -0.70, 0.08]} scale={[1.14, 1.38, 0.98]} span={3.72} mode="rock" />

    <PortalRecess destination="ground" position={[-5.34, 0.02, -9.52]} rotation={[0, 0.62, -0.02]} onActivate={onGround} />
    <PortalRecess destination="life-map" position={[5.48, 0.02, -10.12]} rotation={[0, -0.72, 0.03]} onActivate={onLifeMap} />
    <ProductionAsset url={CAGED_SCONCE} name="home-v76-port-caged-practical" position={[-3.62, 3.72, -10.42]} rotation={[0.10, 0.28, -0.12]} span={0.54} mode="light" />
    <ProductionAsset url={CAGED_SCONCE} name="home-v76-starboard-caged-practical" position={[3.86, 2.86, -10.76]} rotation={[-0.08, -0.24, 0.10]} span={0.46} mode="light" />
    <ProductionAsset url={PIPE_SYSTEM} name="home-v76-port-integrated-service-manifold" position={[-3.72, 1.10, -11.54]} rotation={[0.08, 0.54, 0.08]} scale={[0.54, 0.66, 0.52]} span={1.58} mode="metal" />
    <ProductionAsset url={PIPE_SYSTEM} name="home-v76-starboard-integrated-service-manifold" position={[3.98, 1.58, -11.72]} rotation={[-0.06, -0.48, -0.08]} scale={[0.46, 0.58, 0.46]} span={1.38} mode="metal" />

    <RelicMachine state={orbState} reducedMotion={reducedMotion} onOpen={onOrb} />
    <DustField reducedMotion={reducedMotion} />

    <pointLight position={[-4.56, 2.08, -7.24]} color="#d29a58" intensity={0.68} distance={6.4} decay={2} />
    <pointLight position={[4.62, 2.68, -8.36]} color="#71988d" intensity={0.42} distance={6.2} decay={2} />
    <spotLight position={[-2.8, 5.74, -4.1]} target-position={[-0.38, 2.44, -10.5]} angle={0.32} penumbra={0.84} intensity={0.74} color="#d7b37b" distance={14} decay={2} castShadow shadow-mapSize-width={512} shadow-mapSize-height={512} />
  </group>
}

useGLTF.preload(ROCK_FACE_A)
useGLTF.preload(ROCK_FACE_B)
useGLTF.preload(PIPE_SYSTEM)
useGLTF.preload(CAGED_SCONCE)
useTexture.preload([ROCK_A_DIFFUSE, ROCK_A_NORMAL, ROCK_A_ARM, ROCK_B_DIFFUSE, ROCK_B_NORMAL, ROCK_B_ARM])
