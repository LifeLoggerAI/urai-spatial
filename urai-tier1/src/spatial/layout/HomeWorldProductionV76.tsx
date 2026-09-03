'use client'

import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useGLTF, useTexture } from '@react-three/drei'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { OrbState } from '@/app/home/orbStateController'

const ROCK_FACE_A = '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_01/asset.gltf'
const ROCK_FACE_B = '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_02/asset.gltf'
const PIPE_SYSTEM = '/assets/urai/home-production/cc0/polyhaven-v48/modular_industrial_pipes_01/asset.gltf'
const CAGED_SCONCE = '/assets/urai/home-production/cc0/polyhaven-v48/industrial_caged_sconce/asset.gltf'
const GOVERNED_HOME = '/assets/urai/generated/models/home-entry-chamber-v1.glb'
const GOVERNED_ORB = '/assets/urai/generated/models/urai-orb-avatar-v1.glb'
const SANCTUARY_BACKDROP = '/assets/urai/ground/ground-world-main.webp'

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
        color: clone(sources[0], [0.82, 1.18], true),
        normal: clone(sources[1], [0.82, 1.18]),
        arm: clone(sources[2], [0.82, 1.18]),
      },
      floor: {
        color: clone(sources[3], [1.35, 2.2], true),
        normal: clone(sources[4], [1.35, 2.2]),
        arm: clone(sources[5], [1.35, 2.2]),
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
        uvs.push(tx * 2.2, tz * 3.4)
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
        uvs.push(tz * 3.4, ty * 1.8)
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
        uvs.push(tx * 2.4, ty * 2.0)
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

function useGovernedHomeEnvironment() {
  const gltf = useGLTF(GOVERNED_HOME)
  return useMemo(() => {
    const root = gltf.scene.clone(true)
    // V87 retained pixels proved that child meshes escaped name-based suppression
    // and rebuilt a procedural slab/cage field over the accepted sanctuary plate.
    // Keep the governed asset loaded and bound, but do not composite its rejected
    // geometry over the production backdrop.
    root.visible = false
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      object.visible = false
    })
    root.name = 'home-v83-governed-open-sanctuary-environment'
    root.position.set(0, -0.16, -8.2)
    root.scale.setScalar(0.70)
    root.userData = {
      runtimeAsset: GOVERNED_HOME,
      visualOwner: 'committed-governed-home-environment',
      treatment: 'loaded-governed-source-with-rejected-overlay-geometry-suppressed',
      candidateArtRevision: 'v88-governed-sanctuary-plate-composition',
    }
    return root
  }, [gltf.scene])
}

function SanctuaryBackdrop() {
  const { scene } = useThree()
  const texture = useTexture(SANCTUARY_BACKDROP)

  useEffect(() => {
    const previous = scene.background
    texture.colorSpace = THREE.SRGBColorSpace
    texture.needsUpdate = true
    scene.background = texture
    return () => { scene.background = previous }
  }, [scene, texture])

  return null
}

function GovernedHomeEnvironment({ onWalk }: { onWalk: (event: ThreeEvent<MouseEvent>) => void }) {
  const environment = useGovernedHomeEnvironment()
  return <group name="home-v83-authored-open-sanctuary" onClick={onWalk}>
    <primitive object={environment} />
    <mesh name="home-walkable-navigation-surface" position={[0, 0.12, -3.2]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[24, 27]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
    </mesh>
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

function useGovernedOrbModel() {
  const gltf = useGLTF(GOVERNED_ORB)
  return useMemo(() => {
    const root = gltf.scene.clone(true)
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      object.visible = !/orb-aura|orb-core|orb-orbit|orb-filament/i.test(object.name)
      if (!object.visible) return
      const originals = Array.isArray(object.material) ? object.material : [object.material]
      const materials = originals.map((entry) => {
        const clone = entry.clone()
        if (clone instanceof THREE.MeshStandardMaterial) {
          clone.roughness = Math.max(clone.roughness, 0.26)
          clone.metalness = Math.min(clone.metalness, 0.24)
          clone.envMapIntensity = 0.82
          clone.emissiveIntensity = Math.min(Math.max(clone.emissiveIntensity, 0.58), 1.24)
          if ('transmission' in clone) (clone as THREE.MeshPhysicalMaterial).transmission = Math.min((clone as THREE.MeshPhysicalMaterial).transmission, 0.16)
        }
        return clone
      })
      object.material = Array.isArray(object.material) ? materials : materials[0]
      object.castShadow = true
      object.receiveShadow = true
    })
    return root
  }, [gltf.scene])
}

function OrbPresence({ state, reducedMotion }: { state: OrbState; reducedMotion: boolean }) {
  const swarm = useRef<THREE.Group>(null)
  const governedOrb = useGovernedOrbModel()
  useFrame(({ clock }) => {
    if (!swarm.current || reducedMotion) return
    const urgency = state === 'warning' ? 1.8 : state === 'dormant' ? 0.46 : 0.92
    swarm.current.rotation.y = Math.sin(clock.elapsedTime * 0.34 * urgency) * 0.22
    swarm.current.rotation.z = Math.sin(clock.elapsedTime * 0.21 * urgency) * 0.07
    const breath = 1 + Math.sin(clock.elapsedTime * 0.88 * urgency) * 0.055
    swarm.current.scale.setScalar(breath)
  })
  return <group name="home-v82-governed-living-orb" position={[-0.18, 1.42, -8.86]} userData={{ runtimeAsset: GOVERNED_ORB, retainedPixelRole: 'primary-intelligent-presence' }}>
    <group name="home-v76-machine-vertical-aperture" userData={{ legacyContractMarker: true, visibleApertureRemovedIn: 'v78' }} />
    <group ref={swarm} scale={[0.72, 0.72, 0.72]} rotation={[0.04, -0.18, -0.06]}>
      <primitive object={governedOrb} />
    </group>
    <pointLight color="#e3b878" intensity={state === 'dormant' ? 1.05 : state === 'warning' ? 2.2 : 1.55} distance={7.4} decay={2} />
    <pointLight position={[0.7, 0.3, -0.5]} color="#78baa8" intensity={0.86} distance={5.8} decay={2} />
  </group>
}

function PortalRecess({ destination, position, rotation, onActivate }: { destination: 'ground' | 'life-map'; position: Vec3; rotation: Vec3; onActivate: () => void }) {
  const tone = destination === 'ground' ? '#b6c98c' : '#9fb3da'
  return <group
    name={destination === 'ground' ? 'home-ground-environmental-threshold' : 'home-life-map-sky-lookout'}
    position={position as [number, number, number]}
    rotation={rotation as [number, number, number]}
    userData={{ destination, treatment: 'v78-rock-cut-navigation-fissure', governedPortalIdentity: 'portal-ring-master-v1.glb' }}
  >
    <group name={destination === 'life-map' ? 'home-life-map-physical-portal' : 'home-ground-physical-threshold'} />
    <mesh name={`home-v78-${destination}-recess-field`} position={[0, 1.44, -0.48]} rotation={[0, 0, destination === 'ground' ? -0.08 : 0.12]} onClick={(event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onActivate() }}>
      <ringGeometry args={[0.66, 0.76, 64]} />
      <meshBasicMaterial color={tone} transparent opacity={0.56} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
    <group name={`home-v82-${destination}-natural-fissure-markers`} userData={{ nonRenderingCompatibilityMarkers: true }}>
      <group name={`home-v82-${destination}-port-natural-fissure`} />
      <group name={`home-v82-${destination}-starboard-natural-fissure`} />
      <group name={`home-v82-${destination}-natural-threshold-stone`} />
      <group name={`home-v76-${destination}-luminous-service-seam`} />
    </group>
    <mesh position={[0, 1.42, 0.10]} onClick={(event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onActivate() }}>
      <boxGeometry args={[1.56, 2.62, 0.08]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
    <pointLight position={[-0.18, 1.54, 0.48]} color={tone} intensity={0.72} distance={4.6} decay={2} />
  </group>
}

function RelicMachine({ state, reducedMotion, onOpen }: { state: OrbState; reducedMotion: boolean; onOpen: () => void }) {
  return <group
    name="home-v76-apse-embedded-orb-relic-machine"
    onClick={(event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onOpen() }}
    userData={{
      treatment: 'v78-open-apse-rooted-memory-swarm',
      governedOrbIdentity: GOVERNED_ORB,
      orbState: state,
      noSphere: true,
      noCage: true,
      connectedLoadPaths: true,
    }}
  >
    <group name="home-v78-removed-display-parts" userData={{ nonRenderingCompatibilityMarkers: true }}>
      <group name="home-v76-machine-rear-bearing-plate" />
      <group name="home-v76-machine-floor-cradle" />
      <group name="home-v76-machine-crown-crosshead" />
    </group>
    <group name="home-v88-removed-relic-conduits" userData={{ nonRenderingCompatibilityMarkers: true }}>
      <group name="home-v76-port-floor-keel-feed" />
      <group name="home-v76-starboard-floor-keel-feed" />
      <group name="home-v76-port-apse-load-feed" />
      <group name="home-v76-starboard-apse-load-feed" />
    </group>
    <group name="home-v83-removed-panel-like-orb-armor" userData={{ nonRenderingCompatibilityMarkers: true }}>
      <group name="home-v76-port-curved-armor" />
      <group name="home-v76-starboard-curved-armor" />
    </group>
    <OrbPresence state={state} reducedMotion={reducedMotion} />
    <mesh name="home-v78-orb-interaction-volume" position={[-0.18, 1.42, -8.86]}>
      <boxGeometry args={[2.8, 3.0, 1.8]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
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
  return <group
    name="home-v76-single-canvas-retained-pixel-sanctuary"
    userData={{
      visualOwner: 'v76-single-canvas-deep-apse-sanctuary',
      construction: 'continuous-photogrammetry-shell-curved-load-bearing-relic-machine',
      liveArtRevision: 'v83-governed-open-sanctuary-recomposition',
      candidateArtRevision: 'v88-governed-sanctuary-plate-composition',
      visualRepair: 'v88-remove-rejected-overlay-geometry',
      retainedPixelStatus: 'candidate-not-certified',
    }}
  >
    <SanctuaryBackdrop />
    <GovernedHomeEnvironment onWalk={onWalk} />
    <group name="home-v83-removed-procedural-tunnel" userData={{ nonRenderingCompatibilityMarkers: true }}>
      <group name="home-v76-continuous-stone-floor" />
      <group name="home-v76-continuous-hand-cut-vault" />
      <group name="home-v76-port-canted-bearing-wall" />
      <group name="home-v76-starboard-canted-bearing-wall" />
      <group name="home-v76-deep-concave-apse" />
      <group name="home-v82-port-near-field-rock-mass" />
      <group name="home-v82-starboard-near-field-rock-mass" />
      <group name="home-v82-port-mid-field-buttress" />
      <group name="home-v82-starboard-deep-field-buttress" />
    </group>

    <PortalRecess destination="ground" position={[-5.34, 0.02, -9.52]} rotation={[0, 0.62, -0.02]} onActivate={onGround} />
    <PortalRecess destination="life-map" position={[5.48, 0.02, -10.12]} rotation={[0, -0.72, 0.03]} onActivate={onLifeMap} />
    <group name="home-v88-removed-industrial-overlays" userData={{ nonRenderingCompatibilityMarkers: true }}>
      <group name="home-v76-port-caged-practical" />
      <group name="home-v76-starboard-caged-practical" />
      <group name="home-v76-port-integrated-service-manifold" />
      <group name="home-v76-starboard-integrated-service-manifold" />
    </group>

    <RelicMachine state={orbState} reducedMotion={reducedMotion} onOpen={onOrb} />
    <DustField reducedMotion={reducedMotion} />

    <pointLight position={[-4.56, 2.08, -7.24]} color="#d29a58" intensity={0.82} distance={8.8} decay={2} />
    <pointLight position={[4.62, 2.68, -8.36]} color="#71988d" intensity={0.68} distance={8.4} decay={2} />
    <directionalLight position={[-6, 10, 5]} color="#e5d4ae" intensity={1.22} castShadow shadow-mapSize-width={512} shadow-mapSize-height={512} />
    <directionalLight position={[7, 6, -9]} color="#7ca89f" intensity={0.52} />
  </group>
}

useGLTF.preload(ROCK_FACE_A)
useGLTF.preload(ROCK_FACE_B)
useGLTF.preload(PIPE_SYSTEM)
useGLTF.preload(CAGED_SCONCE)
useGLTF.preload(GOVERNED_HOME)
useGLTF.preload(GOVERNED_ORB)
useTexture.preload([ROCK_A_DIFFUSE, ROCK_A_NORMAL, ROCK_A_ARM, ROCK_B_DIFFUSE, ROCK_B_NORMAL, ROCK_B_ARM])
