'use client'

import { useFrame, type ThreeEvent } from '@react-three/fiber'
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
        color: clone(sources[0], [2.8, 4.6], true),
        normal: clone(sources[1], [2.8, 4.6]),
        arm: clone(sources[2], [2.8, 4.6]),
      },
      floor: {
        color: clone(sources[3], [3.6, 7.2], true),
        normal: clone(sources[4], [3.6, 7.2]),
        arm: clone(sources[5], [3.6, 7.2]),
      },
    }
  }, [sources])
}

function StoneMaterial({ textures, tint, side = THREE.FrontSide }: { textures: TextureSet; tint: string; side?: THREE.Side }) {
  return <meshPhysicalMaterial
    color={tint}
    map={textures.color}
    normalMap={textures.normal}
    normalScale={new THREE.Vector2(0.34, 0.34)}
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
        const xCenter = -6.35 + ((xIndex + 0.5) / xSegments) * 12.7
        // Keep two load-bearing canopy shelves while opening the full center
        // to atmospheric depth. This preserves a real roof structure without
        // returning to the rejected sealed cave/room composition.
        if (Math.abs(xCenter) < 2.15) continue
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
      const y = -0.16 + ty * 3.54
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
        const xCenter = -6.2 + ((xIndex + 0.5) / xSegments) * 12.4
        // Retain asymmetric rear bearing wings and leave a broad central
        // horizon opening for the Orb, ridge and sky to occupy in depth.
        if (Math.abs(xCenter) < 2.30) continue
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

function OpenAtmosphere() {
  const dome = useMemo(() => {
    const geometry = new THREE.SphereGeometry(54, 36, 20)
    const positions = geometry.getAttribute('position')
    const colors: number[] = []
    const horizon = new THREE.Color('#5b786b')
    const zenith = new THREE.Color('#071c29')
    for (let index = 0; index < positions.count; index += 1) {
      const t = THREE.MathUtils.clamp((positions.getY(index) / 54 + 1) * 0.58, 0, 1)
      const color = horizon.clone().lerp(zenith, t)
      colors.push(color.r, color.g, color.b)
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    return geometry
  }, [])
  const stars = useMemo(() => {
    const positions: number[] = []
    for (let index = 0; index < 96; index += 1) {
      const angle = ((index * 47) % 360) * Math.PI / 180
      const radius = 18 + ((index * 29) % 17)
      const height = 5.4 + ((index * 31) % 83) / 83 * 18
      positions.push(Math.cos(angle) * radius, height, Math.sin(angle) * radius - 8)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    return geometry
  }, [])

  return <group name="home-v98-open-atmospheric-depth">
    <mesh name="home-v98-volumetric-sky-dome" geometry={dome} position={[0, -18, -8]} scale={[1, 0.72, 1]}>
      <meshBasicMaterial vertexColors side={THREE.BackSide} fog={false} />
    </mesh>
    <points name="home-v98-deep-atmospheric-motes" geometry={stars}>
      <pointsMaterial color="#cfe5cf" size={0.055} transparent opacity={0.42} depthWrite={false} fog={false} />
    </points>
  </group>
}

function TerracedGround({ textures, onWalk }: { textures: TextureSet; onWalk: (event: ThreeEvent<MouseEvent>) => void }) {
  const ground = useMemo(() => {
    const xSegments = 36
    const zSegments = 64
    const positions: number[] = []
    const uvs: number[] = []
    const indices: number[] = []
    for (let zIndex = 0; zIndex <= zSegments; zIndex += 1) {
      const tz = zIndex / zSegments
      const z = 5.2 - tz * 19.2
      for (let xIndex = 0; xIndex <= xSegments; xIndex += 1) {
        const tx = xIndex / xSegments
        const x = -6.35 + tx * 12.7
        const edgeLift = Math.pow(Math.abs(x) / 6.35, 2.2) * 0.18
        const walkingChannel = Math.exp(-Math.pow(x / 2.8, 2)) * -0.055
        const geologicalRelief = Math.sin(z * 0.62 + x * 0.28) * 0.035 + Math.cos(z * 1.18 - x * 0.41) * 0.018
        const y = -0.12 + tz * 0.42 + edgeLift + walkingChannel + geologicalRelief
        positions.push(x, y, z)
        uvs.push(tx * 3.6, tz * 7.2)
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
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    return geometry
  }, [])
  return <group name="home-v98-terraced-navigable-ground" onClick={onWalk}>
    <mesh name="home-v76-continuous-stone-floor" geometry={ground} receiveShadow>
      <StoneMaterial textures={textures} tint="#47483b" side={THREE.DoubleSide} />
    </mesh>
    <mesh name="home-walkable-navigation-surface" position={[0, 0.28, -3.0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[12.2, 19.4]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
    </mesh>
  </group>
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
    // V87 retained pixels rejected the terrain slab, repeated growth/village field,
    // pedestal, mountains and temporary embodiment markers. Remove those authored
    // subtrees while retaining the governed Ground, Life Map and horizon threshold
    // architecture as visible geometry in the navigable sanctuary.
    const rejectedFamily = /^(?:sanctuary-terrain|mirror-basin|orb-sanctuary-pedestal|horizon-mountain-|sanctuary-waterfall-|inhabited-village-|living-growth-|embodied-presence-root|memory-place-anchor-)/
    // V101 retained pixels also rejected the imported utility tubes as raw scene
    // dressing. Strip those authored details while keeping destination roots live.
    const rejectedUtilityDetail = /(?:pipe|tube|conduit|duct|cable)/i
    // The governed GLB wraps all authored families below home-sanctuary-root.
    // Filtering only scene.children left the rejected village/growth field live.
    // Remove matching subtrees at their actual depth while retaining the three
    // governed destination threshold roots as visible geometry.
    const rejectedNodes: THREE.Object3D[] = []
    root.traverse((object) => {
      if (rejectedFamily.test(object.name) || rejectedUtilityDetail.test(object.name)) rejectedNodes.push(object)
    })
    for (const object of rejectedNodes) object.parent?.remove(object)
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      const originals = Array.isArray(object.material) ? object.material : [object.material]
      const materials = originals.map((entry) => {
        const clone = entry.clone()
        if (clone instanceof THREE.MeshStandardMaterial) {
          clone.roughness = Math.max(clone.roughness, 0.62)
          clone.metalness = Math.min(clone.metalness, 0.22)
          clone.envMapIntensity = 0.78
          if ('transmission' in clone) (clone as THREE.MeshPhysicalMaterial).transmission = Math.min((clone as THREE.MeshPhysicalMaterial).transmission, 0.08)
        }
        return clone
      })
      object.material = Array.isArray(object.material) ? materials : materials[0]
      object.castShadow = true
      object.receiveShadow = true
    })
    root.name = 'home-v83-governed-open-sanctuary-environment'
    root.position.set(0, -0.16, -8.2)
    root.scale.setScalar(0.70)
    root.userData = {
      runtimeAsset: GOVERNED_HOME,
      visualOwner: 'committed-governed-home-environment',
      treatment: 'visible-governed-threshold-architecture-with-rejected-node-families-removed',
      legacyTreatment: 'full-authored-composition-with-duplicate-interaction-art-suppressed',
      candidateArtRevision: 'v93-governed-dimensional-sanctuary',
      successorVisualRepair: 'v95-recursive-rejected-family-removal',
      visibleGovernedFamilies: 'ground-alcove life-map-alcove horizon-threshold',
    }
    return root
  }, [gltf.scene])
}

function SanctuaryBackdrop({ onWalk }: { onWalk: (event: ThreeEvent<MouseEvent>) => void }) {
  const textures = useSanctuaryTextures()
  return <group name="home-v98-open-canyon-sanctuary-architecture" userData={{ retainedPixelOwner: 'physical-pbr-three-dimensional-environment', composition: 'open-terraced-canyon-with-atmospheric-depth' }}>
    <OpenAtmosphere />
    <TerracedGround textures={textures.floor} onWalk={onWalk} />
    <VaultShell textures={textures.shell} />
    <CantedWall side="port" textures={textures.shell} />
    <CantedWall side="starboard" textures={textures.shell} />
    <DeepApse textures={textures.shell} />
    <BearingRib z={-3.8} skew={0.18} textures={textures.shell} />
    <group name="home-v101-removed-entrance-rock-clutter" userData={{ nonRenderingCompatibilityMarkers: true }}>
      <group name="home-v95-port-entry-buttress" />
      <group name="home-v95-starboard-entry-buttress" />
      <group name="home-v98-port-horizon-spire" />
      <group name="home-v98-starboard-horizon-spire" />
    </group>
    <ProductionAsset url={ROCK_FACE_A} name="home-v101-port-apse-foundation" position={[-5.58, 0.58, -12.10]} rotation={[-0.04, 0.74, -0.10]} scale={[1.22, 0.72, 1.04]} span={3.24} mode="rock" />
    <ProductionAsset url={ROCK_FACE_B} name="home-v101-starboard-apse-foundation" position={[5.66, 0.52, -12.28]} rotation={[0.06, -0.70, 0.08]} scale={[1.18, 0.68, 1.02]} span={3.18} mode="rock" />
    <ProductionAsset url={ROCK_FACE_A} name="home-v101-distant-ridge" position={[0.9, 0.42, -23.4]} rotation={[0.04, 1.18, 0.02]} scale={[2.92, 0.62, 1.10]} span={5.2} mode="rock" />
  </group>
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

function ExtrudedBody({ name, points, position, rotation = [0, 0, 0], scale = [1, 1, 1], depth = 0.54, color = '#34463f', metalness = 0.38, roughness = 0.56, textures }: { name: string; points: readonly (readonly [number, number])[]; position: Vec3; rotation?: Vec3; scale?: Vec3; depth?: number; color?: string; metalness?: number; roughness?: number; textures?: TextureSet }) {
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
    {textures
      ? <StoneMaterial textures={textures} tint={color} side={THREE.DoubleSide} />
      : <meshPhysicalMaterial color={color} roughness={roughness} metalness={metalness} clearcoat={0.08} clearcoatRoughness={0.66} envMapIntensity={0.72} side={THREE.DoubleSide} />}
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
    swarm.current.scale.setScalar(1.90 * breath)
  })
  return <group name="home-v82-governed-living-orb" position={[-0.28, 2.48, -6.18]} userData={{ runtimeAsset: GOVERNED_ORB, retainedPixelRole: 'primary-intelligent-presence', v95Composition: 'human-scale-apse-integrated-no-stage-prop', v96Composition: 'legible-living-presence-no-pedestal', v98Composition: 'open-air-living-presence-without-stage', v101Composition: 'foreground-legible-living-presence', v102InteractionRepair: 'authored-scale-retained-and-proximity-aligned' }}>
    <group name="home-v76-machine-vertical-aperture" userData={{ legacyContractMarker: true, visibleApertureRemovedIn: 'v78' }} />
    <group ref={swarm} scale={[1.90, 1.90, 1.90]} rotation={[0.04, -0.18, -0.06]}>
      <primitive object={governedOrb} />
    </group>
    <pointLight color="#e3b878" intensity={state === 'dormant' ? 1.35 : state === 'warning' ? 2.65 : 1.92} distance={8.6} decay={2} />
    <pointLight position={[0.7, 0.3, -0.5]} color="#78baa8" intensity={0.86} distance={5.8} decay={2} />
  </group>
}

function PortalStoneFrame({ destination, textures }: { destination: 'ground' | 'life-map'; textures: TextureSet }) {
  const geometry = useMemo(() => {
    const outer = destination === 'ground'
      ? [[-1.28, -1.42], [1.14, -1.34], [1.30, 0.34], [0.76, 1.34], [0.08, 1.76], [-0.78, 1.42], [-1.34, 0.28]]
      : [[-1.18, -1.36], [1.26, -1.42], [1.32, 0.24], [0.86, 1.40], [-0.02, 1.72], [-0.72, 1.28], [-1.30, 0.38]]
    const shape = new THREE.Shape()
    shape.moveTo(outer[0][0], outer[0][1])
    for (const [x, y] of outer.slice(1)) shape.lineTo(x, y)
    shape.closePath()

    const aperture = new THREE.Path()
    aperture.moveTo(-0.58, -1.18)
    aperture.lineTo(-0.66, 0.20)
    aperture.lineTo(-0.34, 0.92)
    aperture.lineTo(0.02, 1.20)
    aperture.lineTo(0.42, 0.88)
    aperture.lineTo(0.62, 0.16)
    aperture.lineTo(0.58, -1.18)
    aperture.closePath()
    shape.holes.push(aperture)

    const result = new THREE.ExtrudeGeometry(shape, {
      depth: 0.72,
      bevelEnabled: true,
      bevelSegments: 4,
      bevelSize: 0.08,
      bevelThickness: 0.08,
      curveSegments: 10,
    })
    result.center()
    result.computeVertexNormals()
    return result
  }, [destination])

  return <mesh name={`home-v98-${destination}-single-connected-rock-cut-frame`} geometry={geometry} position={[0, 1.34, -0.30]} castShadow receiveShadow>
    <StoneMaterial textures={textures} tint={destination === 'ground' ? '#4c5a46' : '#44495c'} side={THREE.DoubleSide} />
  </mesh>
}

function PortalDepthField({ destination }: { destination: 'ground' | 'life-map' }) {
  const points = useMemo(() => {
    const positions: number[] = []
    for (let index = 0; index < 52; index += 1) {
      const x = (((index * 37) % 97) / 97 - 0.5) * 0.82
      const y = (((index * 61) % 89) / 89 - 0.5) * 1.72 + 1.40
      const z = -0.58 - (((index * 43) % 83) / 83) * 3.8
      positions.push(x, y, z)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    return geometry
  }, [])
  const tone = destination === 'ground' ? '#75d6a0' : '#9eafff'
  return <points name={`home-v98-${destination}-volumetric-threshold-depth`} geometry={points}>
    <pointsMaterial color={tone} size={0.06} transparent opacity={0.68} depthWrite={false} />
  </points>
}

function PortalRecess({ destination, position, rotation, onActivate }: { destination: 'ground' | 'life-map'; position: Vec3; rotation: Vec3; onActivate: () => void }) {
  const tone = destination === 'ground' ? '#75d6a0' : '#9eafff'
  return <group
    name={destination === 'ground' ? 'home-ground-environmental-threshold' : 'home-life-map-sky-lookout'}
    position={position as [number, number, number]}
    rotation={rotation as [number, number, number]}
    userData={{ destination, treatment: 'v95-architectural-rock-cut-threshold-no-ring-marker', governedPortalIdentity: 'portal-ring-master-v1.glb' }}
  >
    <group name={destination === 'life-map' ? 'home-life-map-physical-portal' : 'home-ground-physical-threshold'} />
    <group name={`home-v101-${destination}-foreground-portal-frame-removed`} userData={{ nonRenderingCompatibilityMarkers: true }} />
    <group name={`home-v97-${destination}-port-lower-masonry`} userData={{ compatibilityMarker: true }} />
    <group name={`home-v97-${destination}-port-shoulder-masonry`} userData={{ compatibilityMarker: true }} />
    <group name={`home-v97-${destination}-starboard-lower-masonry`} userData={{ compatibilityMarker: true }} />
    <group name={`home-v97-${destination}-starboard-shoulder-masonry`} userData={{ compatibilityMarker: true }} />
    <group name={`home-v95-${destination}-threshold-lintel`} userData={{ compatibilityMarker: true }} />
    <group name={`home-v96-${destination}-recess-depth`} userData={{ compatibilityMarker: true }} />
    <group name={`home-v95-${destination}-recess-veil`} userData={{ compatibilityMarker: true }} />
    <PortalDepthField destination={destination} />
    <mesh name={`home-v98-${destination}-inner-threshold-glow`} position={[0, 1.42, -0.56]} onClick={(event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onActivate() }}>
      <planeGeometry args={[0.92, 2.12, 1, 1]} />
      <meshBasicMaterial color={tone} transparent opacity={0.11} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
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
    <pointLight position={[-0.18, 1.54, 0.48]} color={tone} intensity={1.18} distance={5.8} decay={2} />
  </group>
}

function ThresholdPath({ destination }: { destination: 'ground' | 'life-map' }) {
  const side = destination === 'ground' ? -1 : 1
  const tone = destination === 'ground' ? '#3f5546' : '#434a5f'
  const pavers = Array.from({ length: 5 }, (_, index) => {
    const t = index / 4
    return {
      x: side * (0.46 + t * t * 3.46),
      y: -0.075 + t * 0.17,
      z: 3.30 - t * 10.20,
      rotation: side * (-0.08 + t * 0.24),
      width: 0.17 + t * 0.09,
    }
  })
  return <group name={`home-v97-${destination}-floor-integrated-guidance`}>
    {pavers.map((paver, index) => <mesh key={index} name={`home-v101-${destination}-embedded-wayfinding-inlay-${index + 1}`} position={[paver.x, paver.y, paver.z]} rotation={[-Math.PI / 2, 0, paver.rotation]} receiveShadow>
      <planeGeometry args={[paver.width * 1.7, paver.width * 4.2]} />
      <meshStandardMaterial color={tone} emissive={tone} emissiveIntensity={0.025} roughness={0.96} metalness={0.01} />
    </mesh>)}
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
    <mesh name="home-v78-orb-interaction-volume" position={[-0.28, 2.48, -6.18]}>
      <boxGeometry args={[3.8, 3.8, 2.4]} />
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
      liveArtRevision: 'v93-governed-dimensional-sanctuary',
      candidateArtRevision: 'v93-governed-dimensional-sanctuary',
      visualRepair: 'v93-remove-flat-plate-and-retain-governed-threshold-architecture',
      successorVisualRepair: 'v101-legible-orb-decluttered-asymmetric-thresholds',
      portraitCompositionRevision: 'v93-single-responsive-three-dimensional-scene',
      retainedPixelStatus: 'candidate-not-certified',
    }}
  >
    <SanctuaryBackdrop onWalk={onWalk} />
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

    <PortalRecess destination="ground" position={[-4.34, 0.02, -7.72]} rotation={[0, 0.42, -0.03]} onActivate={onGround} />
    <PortalRecess destination="life-map" position={[4.38, 0.02, -7.86]} rotation={[0, -0.46, 0.04]} onActivate={onLifeMap} />
    <ThresholdPath destination="ground" />
    <ThresholdPath destination="life-map" />
    <group name="home-v88-removed-industrial-overlays" userData={{ nonRenderingCompatibilityMarkers: true }}>
      <group name="home-v76-port-caged-practical" />
      <group name="home-v76-starboard-caged-practical" />
      <group name="home-v76-port-integrated-service-manifold" />
      <group name="home-v76-starboard-integrated-service-manifold" />
    </group>

    <RelicMachine state={orbState} reducedMotion={reducedMotion} onOpen={onOrb} />
    <DustField reducedMotion={reducedMotion} />

    <pointLight position={[-4.56, 2.08, -7.24]} color="#d29a58" intensity={1.18} distance={9.8} decay={2} />
    <pointLight position={[4.62, 2.68, -8.36]} color="#71988d" intensity={0.98} distance={9.4} decay={2} />
    <directionalLight position={[-6, 10, 5]} color="#e5d4ae" intensity={1.48} castShadow shadow-mapSize-width={512} shadow-mapSize-height={512} />
    <directionalLight position={[7, 6, -9]} color="#7ca89f" intensity={0.74} />
  </group>
}

useGLTF.preload(ROCK_FACE_A)
useGLTF.preload(ROCK_FACE_B)
useGLTF.preload(PIPE_SYSTEM)
useGLTF.preload(CAGED_SCONCE)
useGLTF.preload(GOVERNED_HOME)
useGLTF.preload(GOVERNED_ORB)
useTexture.preload([ROCK_A_DIFFUSE, ROCK_A_NORMAL, ROCK_A_ARM, ROCK_B_DIFFUSE, ROCK_B_NORMAL, ROCK_B_ARM])
