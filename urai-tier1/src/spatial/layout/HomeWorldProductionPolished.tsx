'use client'

import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer, Stars, useAnimations, useGLTF } from '@react-three/drei'
import { Component, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { isOrbState, resolveOrbSensoryOutput, URAI_ORB_STATE_EVENT, type OrbState, type OrbStateEventDetail } from '@/app/home/orbStateController'
import { MobileMovementPad, stepEmbodiedMotion, useDragLook, useMovementInput, type MovementInput } from '@/spatial/navigation/EmbodiedNavigation'
import { useSceneStore } from '@/spatial/store/useSceneStore'
import { requestUraiWorldOrbOpen, requestUraiWorldTravel } from '@/spatial/world/worldEvents'
import { HomeInterpretiveSplatEnvironment, resolveHomeInterpretiveSplatAsset } from '@/spatial/home/HomeInterpretiveSplat'
import { sensorySafeEnabled, URAI_SENSORY_SAFE_EVENT, URAI_SENSORY_SAFE_STORAGE_KEY } from '@/spatial/accessibility/SensorySafeRuntime'
import { useAdaptiveSpatialQuality } from '@/spatial/performance/useAdaptiveSpatialQuality'
import { HOME_COURTYARD, HOME_NAVIGATION_OBSTACLES, HOME_POND, HOME_POND_WATER_LEVEL, homeCourtyardFloorHeight, homeTerrainHeight, homeWalkSurfaceHeight, makeHomeHorizonGeometry, makeHomePatchGeometry, makeHomeRibbonGeometry, makeHomeTerrainGeometry, projectHomeTerrainGeometry, resolveHomeSolidPenetration } from './HomeSanctuaryGeometry'
import { applyOriginalHomeSurfaceDetail, HomeSkyGradient, HomeSurfaceMaterial } from './HomeSanctuaryMaterials'
import styles from './HomeWorldProduction.module.css'

const HOME_PROVIDER_ENVIRONMENT = '/assets/urai/home/home-threshold-main.webp'
const HOME_SANCTUARY_MODEL = '/assets/urai/generated/models/home-entry-chamber-v1.glb'
const HOME_FERN_MODEL = '/assets/urai/home-production/cc0/polyhaven-fern-02-geometry-v1.glb'
const ORB_MODEL = '/assets/urai/generated/models/urai-orb-avatar-v1.glb'
const HOME_SCANNED_COMPOSITION_V1 = 'canonical-sanctuary-plus-cc0-fern-plus-living-orb'
const HOME_INTERPRETIVE_SPLAT_ASSET = resolveHomeInterpretiveSplatAsset(process.env.NEXT_PUBLIC_URAI_HOME_INTERPRETIVE_SPLAT_ASSET)
const HOME_BOUNDS = { minX: -14, maxX: 14, minZ: -18, maxZ: 12 }
const SPAWN = new THREE.Vector3(-0.85, 0, 8.4)
const ORB = new THREE.Vector3(0, 0.82, -4.25)
const GROUND_THRESHOLD = new THREE.Vector3(-5.4, 0, -10.8)
const LIFE_MAP_LOOKOUT = new THREE.Vector3(5.4, 0, -10.8)
const ASCENT_DURATION_SECONDS = 3.4
const GROUND_DESCENT_DURATION_SECONDS = 2.6

const ORB_CLIPS: Record<OrbState, string> = {
  dormant: 'Orb_Resting', idle: 'Orb_Idle', attention: 'Orb_Attention', listening: 'Orb_Listening', thinking: 'Orb_Thinking', speaking: 'Orb_Speaking', guiding: 'Orb_Guiding', reflecting: 'Orb_Reflecting', calming: 'Orb_Calming', privacy: 'Orb_Privacy', warning: 'Orb_Degraded', transition: 'Orb_Transition',
}

const ORB_PALETTE: Record<OrbState, { core: string; emissive: string; aura: string; light: string }> = {
  dormant: { core: '#b7c7c6', emissive: '#355b59', aura: '#708d8a', light: '#8ca8a6' },
  idle: { core: '#d3f4ef', emissive: '#5eaaa3', aura: '#8de1d4', light: '#a7f0e5' },
  attention: { core: '#f2fbf8', emissive: '#91d9d1', aura: '#c8f7f0', light: '#e6fffb' },
  listening: { core: '#e4fbff', emissive: '#63d7e8', aura: '#8cecff', light: '#c6f7ff' },
  thinking: { core: '#eee9ff', emissive: '#8e75d8', aura: '#a58be8', light: '#cfc2ff' },
  speaking: { core: '#fff9e8', emissive: '#e1b96d', aura: '#f1d596', light: '#fff0bd' },
  guiding: { core: '#f5fff4', emissive: '#80c58b', aura: '#a8e6ad', light: '#d3ffd5' },
  reflecting: { core: '#eef1ff', emissive: '#827bb5', aura: '#a7a2d9', light: '#d8d5ff' },
  calming: { core: '#e6fff5', emissive: '#5fae91', aura: '#86d6b9', light: '#c4f6df' },
  privacy: { core: '#f5fbff', emissive: '#6ba7d2', aura: '#8fc7ee', light: '#d2edff' },
  warning: { core: '#fff1d8', emissive: '#c07b36', aura: '#dc9952', light: '#ffd59a' },
  transition: { core: '#f8ffff', emissive: '#8cd9e3', aura: '#c3f6ff', light: '#f0ffff' },
}

type Nearby = 'orb' | 'ground' | 'life-map' | null
type TransitionSequence = 'idle' | 'ground:opening' | 'ground:traversal' | 'ground:closing' | 'life-map:opening' | 'life-map:traversal' | 'life-map:closing'
type Props = { onOrbOpen?: () => void; webglAvailable?: boolean; onSceneFailure?: (error: Error) => void }
type PathPoint = readonly [number, number]

class HomeSceneAssetBoundary extends Component<{ children: ReactNode; onFailure?: (error: Error) => void }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error) {
    this.props.onFailure?.(error)
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}

function seeded(index: number, salt = 0) {
  const value = Math.sin(index * 91.73 + salt * 37.17) * 43758.5453
  return value - Math.floor(value)
}

function cloneNaturalSanctuaryMaterial(material: THREE.Material, grounded: boolean) {
  const clone = material.clone()
  if (clone instanceof THREE.MeshStandardMaterial) {
    // Keep authored maps on non-ground surfaces. The generated terrain shares
    // a blue/cyan sci-fi atlas, not stone photography; it must not tint the yard.
    clone.roughness = THREE.MathUtils.clamp(Math.max(clone.roughness, grounded ? .72 : .64), .64, .96)
    clone.metalness = Math.min(clone.metalness, .08)
    clone.envMapIntensity = THREE.MathUtils.clamp(Math.max(clone.envMapIntensity, .72), .72, 1.08)
    // The retained terrain's shared albedo is cyan and its packed map lowers
    // roughness substantially. Scalar tint/roughness adjustments alone multiply
    // those maps and leave a shiny blue foreground. Remove those inappropriate
    // bindings explicitly; retain geometry and the subtle authored normal map.
    if (grounded) {
      clone.map = null
      clone.roughnessMap = null
      clone.metalnessMap = null
      clone.emissiveMap = null
      // The atlas AO channel is zero throughout, rather than local occlusion.
      clone.aoMap = null
      clone.roughness = .96
      clone.envMapIntensity = .32
      clone.color.set('#ffffff')
      clone.vertexColors = true
      clone.normalMap = null
      clone.emissive.set('#000000')
      clone.emissiveIntensity = 0
      clone.metalness = 0
      clone.transparent = false
      clone.opacity = 1
      if (clone instanceof THREE.MeshPhysicalMaterial) {
        clone.transmission = 0
        clone.clearcoat = 0
      }
      applyOriginalHomeSurfaceDetail(clone, 'ground')
    }
    clone.needsUpdate = true
  }
  return clone
}

function prepareNaturalSanctuary(source: THREE.Object3D) {
  const world = source.clone(true)
  world.position.set(0, .02, -1.15)
  world.scale.setScalar(.94)
  world.updateWorldMatrix(true, true)
  const groundBounds = new THREE.Box3()
  const rejected = /mirror-basin|portal|ring|threshold|village|mannequin|avatar|debug|marker|label|embodied|presence|memory-place-anchor|living-growth|vault|monolith|bridge|grove|firefly|alcove|veil|waterfall|sculpture|pedestal|rib|mountain|ridge|peak|horizon|low[-_ ]?poly|prototype|blockout|proof/i
  let visibleMeshCount = 0
  world.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    object.visible = !rejected.test(object.name)
    if (!object.visible) return
    const name = object.name.toLowerCase()
    const grounded = /basin|path|ground|terrain|stone|floor/.test(name)
    if (grounded) {
      object.geometry = projectHomeTerrainGeometry(object.geometry, object.matrixWorld)
      object.userData.homeProjectedGround = true
      groundBounds.union(new THREE.Box3().setFromBufferAttribute(object.geometry.attributes.position as THREE.BufferAttribute).applyMatrix4(object.matrixWorld))
    }
    object.material = Array.isArray(object.material)
      ? object.material.map((material) => cloneNaturalSanctuaryMaterial(material, grounded))
      : cloneNaturalSanctuaryMaterial(object.material, grounded)
    object.castShadow = true
    object.receiveShadow = true
    visibleMeshCount += 1
  })
  world.name = 'home-canonical-sanctuary-structure'
  world.userData.visibleMeshCount = visibleMeshCount
  world.userData.role = 'retained-ground-topology-with-original-procedural-materials'
  if (!groundBounds.isEmpty()) world.userData.groundBounds = { minX: groundBounds.min.x, maxX: groundBounds.max.x, minZ: groundBounds.min.z, maxZ: groundBounds.max.z }
  return world
}

function terrainHeight(x: number, z: number) {
  return homeTerrainHeight(x, z)
}

function makePathPoints(from: THREE.Vector3, to: THREE.Vector3, bend: number, count = 24): PathPoint[] {
  return Array.from({ length: count }, (_, index) => {
    const t = index / (count - 1)
    const x = THREE.MathUtils.lerp(from.x, to.x, t) + Math.sin(t * Math.PI) * bend
    const z = THREE.MathUtils.lerp(from.z, to.z, t)
    return [x, z] as const
  })
}

function makeRibbonGeometry(points: readonly PathPoint[], width: number) {
  return makeHomeRibbonGeometry(points, width)
}

function makeIrregularPatchGeometry(centerX: number, centerZ: number, radiusX: number, radiusZ: number, salt: number, segments = 36) {
  return makeHomePatchGeometry(centerX, centerZ, radiusX, radiusZ, salt, undefined, segments)
}

function makeRidgeGeometry(width: number, amplitude: number, salt: number, segments = 72) {
  return makeHomeHorizonGeometry(width, amplitude, salt, segments)
}

function makeAuthoredBoulderGeometry(salt: number, rings = 9, segments = 18) {
  const positions: number[] = []
  const indices: number[] = []
  for (let ring = 0; ring <= rings; ring += 1) {
    const v = ring / rings
    const phi = v * Math.PI
    for (let segment = 0; segment < segments; segment += 1) {
      const u = segment / segments
      const theta = u * Math.PI * 2
      const radialNoise = .82
        + seeded(ring * segments + segment, salt) * .23
        + Math.sin(theta * 3 + salt) * .045
        + Math.cos(phi * 2.6 + salt * .7) * .04
      const squash = .86 + seeded(segment, salt + 19) * .16
      positions.push(
        Math.sin(phi) * Math.cos(theta) * radialNoise * squash,
        Math.cos(phi) * radialNoise,
        Math.sin(phi) * Math.sin(theta) * radialNoise * (1.04 - (squash - .86) * .45),
      )
    }
  }
  for (let ring = 0; ring < rings; ring += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const next = (segment + 1) % segments
      const a = ring * segments + segment
      const b = ring * segments + next
      const c = (ring + 1) * segments + segment
      const d = (ring + 1) * segments + next
      indices.push(a, c, b, b, c, d)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

const SANCTUARY_BOULDER_LEFT = makeAuthoredBoulderGeometry(131)
const SANCTUARY_BOULDER_RIGHT = makeAuthoredBoulderGeometry(173)
const SANCTUARY_BOULDER_CENTER = makeAuthoredBoulderGeometry(211, 8, 16)
const COURTYARD_MASONRY_GEOMETRY = new RoundedBoxGeometry(.42, .218, .402, 1, .014)
const COURTYARD_SEAT_GEOMETRY = new RoundedBoxGeometry(.195, .075, 2.78, 1, .009)

const MAIN_PATH_GEOMETRY = makeRibbonGeometry(makePathPoints(SPAWN, new THREE.Vector3(0, 0, -5.4), -.72, 30), 1.05)
const GROUND_PATH_GEOMETRY = makeRibbonGeometry(makePathPoints(new THREE.Vector3(-.2, 0, -5.15), GROUND_THRESHOLD, -.48, 18), .76)
const LIFE_MAP_PATH_GEOMETRY = makeRibbonGeometry(makePathPoints(new THREE.Vector3(.25, 0, -5.15), LIFE_MAP_LOOKOUT, .55, 18), .76)
const ORB_CLEARING_GEOMETRY = makeIrregularPatchGeometry(ORB.x, ORB.z, 2.7, 1.85, 41)
const POND_GEOMETRY = makeIrregularPatchGeometry(HOME_POND.x, HOME_POND.z, HOME_POND.radiusX * 1.18, HOME_POND.radiusZ * 1.18, 73)
const POND_INNER_GEOMETRY = makeHomePatchGeometry(HOME_POND.x, HOME_POND.z, HOME_POND.radiusX * .9, HOME_POND.radiusZ * .9, 91, HOME_POND_WATER_LEVEL, 48, 1)
const RIDGE_NEAR = makeRidgeGeometry(88, 2.45, .6)
const RIDGE_MID = makeRidgeGeometry(96, 2.8, 1.7)
const RIDGE_FAR = makeRidgeGeometry(104, 3.1, 2.8)

const FERN_PLACEMENTS = Array.from({ length: 72 }, (_, index) => {
  const side = index % 2 === 0 ? -1 : 1
  const band = Math.floor(index / 2)
  const z = 7.6 - (band % 18) * 1.28 + (seeded(index, 64) - .5) * .78
  const edge = 5.2 + seeded(index, 65) * 6.3
  const x = side * edge + (seeded(index, 66) - .5) * 1.1
  const scale = .46 + seeded(index, 67) * .52
  const rotation = seeded(index, 68) * Math.PI * 2
  return [x, z, scale, rotation] as const
})

const STONE_SCATTER = Array.from({ length: 34 }, (_, index) => {
  const lane = index % 3
  const t = (index + 1) / 35
  const z = THREE.MathUtils.lerp(6.9, -10.4, t) + (seeded(index, 201) - .5) * 1.25
  const center = lane === 0 ? -2.7 : lane === 1 ? 2.9 : (seeded(index, 202) - .5) * 7.4
  const x = center + (seeded(index, 203) - .5) * 2.2
  const scale = .11 + seeded(index, 204) * .22
  const rotation = seeded(index, 205) * Math.PI * 2
  return [x, z, scale, rotation] as const
})

function Terrain({ target }: { target: MutableRefObject<THREE.Vector3 | null> }) {
  const sanctuary = useGLTF(HOME_SANCTUARY_MODEL)
  const authored = useMemo(() => prepareNaturalSanctuary(sanctuary.scene), [sanctuary.scene])
  const extension = useMemo(() => makeHomeTerrainGeometry(authored.userData.groundBounds), [authored])
  useEffect(() => () => {
    extension.dispose()
    authored.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || !object.visible) return
      if (object.userData.homeProjectedGround) object.geometry.dispose()
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      materials.forEach((material) => material.dispose())
    })
  }, [authored, extension])
  const onWalk = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (useSceneStore.getState().inputLocked) return
    target.current = new THREE.Vector3(THREE.MathUtils.clamp(event.point.x, HOME_BOUNDS.minX, HOME_BOUNDS.maxX), 0, THREE.MathUtils.clamp(event.point.z, HOME_BOUNDS.minZ, HOME_BOUNDS.maxZ))
  }
  return <group name="home-authored-terrain" userData={{ geometryOwner: 'retained-glb-ground-topology-plus-original-terrain-extension', materialOwner: 'original-procedural-detail-not-photographic-pbr', sharedElevation: true }}>
    <primitive object={authored} />
    <mesh name="home-natural-terrain" geometry={extension} receiveShadow onClick={onWalk}>
      <HomeSurfaceMaterial kind="ground" color="#ffffff" vertexColors roughness={.96} metalness={0} envMapIntensity={.32} />
    </mesh>
    <mesh name="home-walkable-navigation-surface" rotation={[-Math.PI / 2, 0, 0]} position={[0, .7, -2]} onClick={onWalk}>
      <planeGeometry args={[28, 34]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
    </mesh>
  </group>
}

function SanctuaryPath() {
  return <group name="home-sanctuary-path" userData={{ role: 'walkable-natural-stone-thread' }}>
    <mesh geometry={MAIN_PATH_GEOMETRY} receiveShadow><HomeSurfaceMaterial color="#8a897b" roughness={.94} metalness={0} envMapIntensity={.42} /></mesh>
    <mesh geometry={GROUND_PATH_GEOMETRY} receiveShadow><HomeSurfaceMaterial color="#838576" roughness={.96} metalness={0} envMapIntensity={.4} /></mesh>
    <mesh geometry={LIFE_MAP_PATH_GEOMETRY} receiveShadow><HomeSurfaceMaterial color="#818779" roughness={.96} metalness={0} envMapIntensity={.4} /></mesh>
  </group>
}

function Vegetation() {
  const fern = useGLTF(HOME_FERN_MODEL)
  const materials = useMemo(() => [
    new THREE.MeshStandardMaterial({ color: '#6f8d68', roughness: .96, metalness: 0, side: THREE.DoubleSide }),
    new THREE.MeshStandardMaterial({ color: '#819b72', roughness: .94, metalness: 0, side: THREE.DoubleSide }),
    new THREE.MeshStandardMaterial({ color: '#5f7c61', roughness: .97, metalness: 0, side: THREE.DoubleSide }),
  ], [])
  useEffect(() => () => materials.forEach((material) => material.dispose()), [materials])
  const instances = useMemo(() => FERN_PLACEMENTS.map(([x,z,scale,rotation], index) => {
    const object = fern.scene.clone(true)
    object.name = `home-scanned-fern-${index + 1}`
    object.position.set(x, terrainHeight(x,z) + .025, z)
    object.rotation.y = rotation
    object.scale.set(scale * (1 + seeded(index, 16) * .08), scale * (.9 + seeded(index, 22) * .18), scale * (1 + seeded(index, 29) * .08))
    object.traverse((child) => { if (child instanceof THREE.Mesh) { child.material = materials[index % materials.length]; child.castShadow = index < 24; child.receiveShadow = true } })
    return object
  }), [fern.scene, materials])
  return <group name="home-living-vegetation" userData={{ role: 'edge-clustered-scanned-cc0-nature', source: 'Poly Haven fern_02 CC0' }}>{instances.map((object) => <primitive key={object.name} object={object} />)}</group>
}

type StonePlacement = (typeof STONE_SCATTER)[number]

function StoneBatch({
  placements,
  indexOffset,
  castShadow,
}: {
  placements: readonly StonePlacement[]
  indexOffset: number
  castShadow: boolean
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const transform = useMemo(() => new THREE.Object3D(), [])
  const color = useMemo(() => new THREE.Color(), [])
  const material = useMemo(() => applyOriginalHomeSurfaceDetail(new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: .98,
    metalness: 0,
  }), 'stone'), [])

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return

    placements.forEach(([x,z,scale,rotation], localIndex) => {
      const index = indexOffset + localIndex
      transform.position.set(x, terrainHeight(x,z) + scale * .32, z)
      transform.rotation.set(seeded(index, 206) * .35, rotation, (seeded(index, 207) - .5) * .3)
      transform.scale.set(
        scale * (1.15 + seeded(index, 208) * .5),
        scale * (.65 + seeded(index, 209) * .35),
        scale,
      )
      transform.updateMatrix()
      mesh.setMatrixAt(localIndex, transform.matrix)
      color.set(index % 3 === 0 ? '#687067' : index % 3 === 1 ? '#76776d' : '#5e6860')
      mesh.setColorAt(localIndex, color)
    })

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [color, indexOffset, placements, transform])

  useEffect(() => () => material.dispose(), [material])

  return (
    <instancedMesh
      ref={meshRef}
      args={[SANCTUARY_BOULDER_CENTER, material, placements.length]}
      castShadow={castShadow}
      receiveShadow
      dispose={null}
    />
  )
}

function GroundDetail() {
  return <group name="home-ground-detail" userData={{ role: 'deterministic-natural-stone-scatter-instanced' }}>
    <StoneBatch placements={STONE_SCATTER.slice(0, 12)} indexOffset={0} castShadow />
    <StoneBatch placements={STONE_SCATTER.slice(12)} indexOffset={12} castShadow={false} />
  </group>
}

function Horizon() {
  return <group name="home-mountain-horizon" userData={{ source: 'original-three-dimensional-runtime-landform', photographicEvidence: false }}>
    <mesh geometry={RIDGE_FAR} position={[0, -1.05, -54]}><meshStandardMaterial color="#536967" roughness={1} metalness={0} envMapIntensity={.2} /></mesh>
    <mesh geometry={RIDGE_MID} position={[0, -1.35, -46]}><meshStandardMaterial color="#485e54" roughness={1} metalness={0} envMapIntensity={.2} /></mesh>
    <mesh geometry={RIDGE_NEAR} position={[0, -1.65, -39]}><meshStandardMaterial color="#405642" roughness={1} metalness={0} envMapIntensity={.2} /></mesh>
    <group position={[-17, 13.5, -52]}>
      <mesh><sphereGeometry args={[1.5, 32, 32]} /><meshBasicMaterial color="#e5eee4" toneMapped={false} /></mesh>
      <mesh scale={1.7}><sphereGeometry args={[1.5, 24, 24]} /><meshBasicMaterial color="#d9ede4" transparent opacity={.035} depthWrite={false} toneMapped={false} /></mesh>
    </group>
  </group>
}

function CourtyardMasonry({ side }: { side: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    if (!mesh.current) return
    const transform = new THREE.Object3D()
    const color = new THREE.Color()
    for (let course = 0; course < 3; course += 1) {
      for (let block = 0; block < 8; block += 1) {
        const index = course * 8 + block
        transform.position.set(side * .76, .15 + course * .23, (block - 3.5) * .42 + (course % 2) * .08)
        transform.updateMatrix()
        mesh.current.setMatrixAt(index, transform.matrix)
        color.set(block % 3 === 0 ? '#a09581' : block % 3 === 1 ? '#8b806f' : '#938a77')
        mesh.current.setColorAt(index, color)
      }
    }
    mesh.current.instanceMatrix.needsUpdate = true
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true
    mesh.current.computeBoundingSphere()
  }, [side])
  return <instancedMesh ref={mesh} args={[COURTYARD_MASONRY_GEOMETRY, undefined, 24]} castShadow receiveShadow>
    <HomeSurfaceMaterial roughness={.96} metalness={0} />
  </instancedMesh>
}

// Original runtime construction, not a scan or a reconstruction of a user's
// home. Low walls and timber seating define a roofless inhabited courtyard;
// all construction stays outside the Orb and environmental travel approach lanes.
function RooflessCourtyard() {
  return <group name="home-roofless-courtyard" userData={{ source: 'URAI original runtime geometry', historicalEvidence: false, ceiling: false }}>
    {[-1, 1].map((side) => <group key={side} position={[side * HOME_COURTYARD.centerX, homeCourtyardFloorHeight(side), HOME_COURTYARD.centerZ]} rotation={[0, side * HOME_COURTYARD.angle, 0]}>
      <mesh position={[0, -.125, .05]} receiveShadow castShadow>
        <boxGeometry args={[2.5, .25, 4.25]} />
        <HomeSurfaceMaterial color="#8f8c7c" roughness={.96} metalness={0} />
      </mesh>
      <group name={`home-courtyard-masonry-${side}`}>
        <CourtyardMasonry side={side} />
        <mesh position={[side * .76, .76, .04]} castShadow receiveShadow>
          <boxGeometry args={[.49, .08, 3.47]} />
          <HomeSurfaceMaterial color="#a5a18f" roughness={.93} />
        </mesh>
      </group>
      <group name={`home-courtyard-timber-bench-${side}`}>
        {[-1.05, 1.05].map((z) => <mesh key={z} position={[0, .19, z]} castShadow receiveShadow>
          <boxGeometry args={[.45, .38, .28]} />
          <HomeSurfaceMaterial color="#817d6d" roughness={.97} />
        </mesh>)}
        {[-.21, 0, .21].map((x) => <mesh key={x} geometry={COURTYARD_SEAT_GEOMETRY} position={[x, .415, 0]} castShadow receiveShadow>
          <HomeSurfaceMaterial kind="timber" color={x === 0 ? '#775638' : '#826144'} roughness={.87} metalness={0} />
        </mesh>)}
        {[-1.11, 1.11].map((z) => <mesh key={z} position={[side * .29, .65, z]} castShadow>
          <boxGeometry args={[.055, .5, .055]} />
          <HomeSurfaceMaterial kind="timber" color="#654d35" roughness={.88} />
        </mesh>)}
        {[.73, .91].map((y) => <mesh key={y} position={[side * .29, y, 0]} castShadow receiveShadow>
          <boxGeometry args={[.075, .16, 2.76]} />
          <HomeSurfaceMaterial kind="timber" color="#876748" roughness={.88} />
        </mesh>)}
      </group>
      <group name={`home-courtyard-side-table-${side}`} position={[-side * .65, 0, 1.82]}>
        <mesh position={[0, .27, 0]} castShadow receiveShadow><boxGeometry args={[.3, .54, .3]} /><HomeSurfaceMaterial color="#85765f" roughness={.96} /></mesh>
        <mesh position={[0, .56, 0]} castShadow receiveShadow><boxGeometry args={[.65, .09, .58]} /><HomeSurfaceMaterial color="#a2947b" roughness={.93} /></mesh>
        <mesh position={[.12, .68, -.05]} castShadow><cylinderGeometry args={[.075, .065, .15, 24]} /><meshStandardMaterial color="#b08e65" roughness={.84} /></mesh>
      </group>
    </group>)}
  </group>
}

function SanctuaryPavilion() {
  return <group name="home-sanctuary-pavilion" userData={{ role: 'open-air-inhabited-resting-place-without-ceiling', ceiling: false, skyDominant: true }}>
    <mesh geometry={ORB_CLEARING_GEOMETRY} receiveShadow>
      <HomeSurfaceMaterial kind="ground" color="#64715f" roughness={.95} metalness={0} envMapIntensity={.32} />
    </mesh>
    <mesh geometry={SANCTUARY_BOULDER_LEFT} position={[-2.85, terrainHeight(-2.85,-6.15) + .42, -6.15]} rotation={[.18,.38,-.14]} scale={[1.2,.58,.82]} castShadow receiveShadow>
      <HomeSurfaceMaterial color="#727b70" roughness={.96} metalness={0} />
    </mesh>
    <mesh geometry={SANCTUARY_BOULDER_RIGHT} position={[2.75, terrainHeight(2.75,-6.35) + .4, -6.35]} rotation={[-.12,-.42,.17]} scale={[1.08,.52,.76]} castShadow receiveShadow>
      <HomeSurfaceMaterial color="#68756b" roughness={.97} metalness={0} />
    </mesh>
    <RooflessCourtyard />
    <group name="home-lived-in-stone-seating" userData={{ treatment: 'irregular-authored-stone-no-proof-cylinders' }}>
      <mesh geometry={SANCTUARY_BOULDER_LEFT} position={[-7, terrainHeight(-7, -7) + .3, -7]} scale={[1.1, .35, .8]} castShadow receiveShadow>
        <HomeSurfaceMaterial color="#8b8576" roughness={.96} metalness={0} />
      </mesh>
      <mesh geometry={SANCTUARY_BOULDER_RIGHT} position={[7, terrainHeight(7, -7) + .3, -7]} scale={[1.1, .35, .8]} castShadow receiveShadow>
        <HomeSurfaceMaterial color="#8a8070" roughness={.96} metalness={0} />
      </mesh>
    </group>
    <group name="home-stone-hearth" position={[2.55, terrainHeight(2.55,-5.55) + .09, -5.55]} userData={{ treatment: 'irregular-stone-ring' }}>
      {Array.from({ length: 10 }, (_, index) => {
        const angle = index / 10 * Math.PI * 2
        const radius = .58 + Math.sin(index * 2.17) * .035
        return <mesh
          key={index}
          geometry={SANCTUARY_BOULDER_CENTER}
          castShadow
          receiveShadow
          position={[Math.cos(angle) * radius, .12 + (index % 2) * .018, Math.sin(angle) * radius]}
          rotation={[(index % 3) * .07, angle + .24, (index % 2 ? -.08 : .06)]}
          scale={[.23 + (index % 3) * .018, .14 + (index % 2) * .015, .19 + ((index + 1) % 3) * .012]}
        ><HomeSurfaceMaterial color={index % 2 ? "#626860" : "#707269"} roughness={.98} metalness={0} /></mesh>
      })}
      <mesh position={[0,.105,0]} rotation={[-Math.PI / 2,0,0]}><circleGeometry args={[.43,48]} /><meshStandardMaterial color="#292824" roughness={1} /></mesh>
      <mesh position={[0,.25,0]}><sphereGeometry args={[.16,32,20]} /><meshBasicMaterial color="#d38a54" transparent opacity={.42} toneMapped={false} /></mesh>
      <pointLight position={[0,.56,0]} color="#e7a46c" intensity={.42} distance={4.5} decay={2} />
    </group>
  </group>
}
function Water() {
  return <group name="home-reflecting-water" userData={{ role: 'integrated-natural-pond' }}>
    <mesh geometry={POND_GEOMETRY} receiveShadow><HomeSurfaceMaterial kind="ground" color="#40564e" roughness={1} metalness={0} /></mesh>
    <mesh geometry={POND_INNER_GEOMETRY}>
      <meshPhysicalMaterial color="#57746a" roughness={.18} metalness={0} clearcoat={.72} clearcoatRoughness={.12} transparent opacity={.8} envMapIntensity={1.05} depthWrite={false} />
    </mesh>
  </group>
}

function OrbMotes({ reducedMotion, color }: { reducedMotion: boolean; color: string }) {
  const ref = useRef<THREE.Points>(null)
  const geometry = useMemo(() => {
    const positions = new Float32Array(54 * 3)
    for (let index = 0; index < 54; index += 1) {
      const radius = .72 + seeded(index, 51) * .46
      const angle = seeded(index, 52) * Math.PI * 2
      positions[index * 3] = Math.cos(angle) * radius
      positions[index * 3 + 1] = (seeded(index, 53) - .5) * 1.15
      positions[index * 3 + 2] = Math.sin(angle) * radius
    }
    const next = new THREE.BufferGeometry()
    next.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return next
  }, [])
  useEffect(() => () => geometry.dispose(), [geometry])
  useFrame((_, delta) => { if (!reducedMotion && ref.current) ref.current.rotation.y += delta * .065 })
  return <points ref={ref} geometry={geometry}><pointsMaterial color={color} size={.024} transparent opacity={.38} depthWrite={false} toneMapped={false} /></points>
}

function OrbGroundGlow({ state }: { state: OrbState }) {
  const palette = ORB_PALETTE[state]
  return <group position={[ORB.x, terrainHeight(ORB.x, ORB.z) + .032, ORB.z]} rotation={[-Math.PI / 2, 0, 0]} userData={{ treatment: 'soft-grounded-light-no-rings' }}>
    <mesh><circleGeometry args={[1.18, 64]} /><meshBasicMaterial color={palette.aura} transparent opacity={.032} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></mesh>
  </group>
}

function SacredOrb({ state, reducedMotion, reducedStimulation, onOpen }: { state: OrbState; reducedMotion: boolean; reducedStimulation: boolean; onOpen: () => void }) {
  const root = useRef<THREE.Group>(null)
  const authoredCore = useRef<THREE.Group>(null)
  const activeAction = useRef<THREE.AnimationAction | null>(null)
  const light = useRef<THREE.PointLight>(null)
  const orb = useGLTF(ORB_MODEL)
  const authoredOrb = useMemo(() => {
    const clone = orb.scene.clone(true)
    clone.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      object.castShadow = true
      object.receiveShadow = true
      object.material = Array.isArray(object.material)
        ? object.material.map((material) => material.clone())
        : object.material.clone()
    })
    return clone
  }, [orb.scene])
  const { actions } = useAnimations(orb.animations, authoredOrb)
  const sensory = useMemo(() => resolveOrbSensoryOutput(state, reducedMotion, true, reducedStimulation), [reducedMotion, reducedStimulation, state])
  const staticPresentation = sensory.movement === 'settled'
  const palette = ORB_PALETTE[state]

  useEffect(() => {
    const allActions = Object.values(actions).filter((action): action is THREE.AnimationAction => Boolean(action))
    if (staticPresentation) {
      allActions.forEach((action) => action.stop())
      activeAction.current = null
      return
    }
    const next = actions[ORB_CLIPS[state]]
    if (!next) return
    const previous = activeAction.current
    if (previous && previous !== next) previous.fadeOut(0.18)
    next.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.18).play()
    activeAction.current = next
  }, [actions, staticPresentation, state])

  useEffect(() => () => {
    Object.values(actions).forEach((action) => action?.stop())
  }, [actions])

  useFrame(({ clock }) => {
    if (!root.current) return
    const speed = state === 'speaking' ? 2.4 : state === 'thinking' ? 1.8 : state === 'listening' ? 1.25 : state === 'transition' ? 1.45 : .82
    if (staticPresentation) {
      root.current.position.y = ORB.y
      root.current.rotation.y = 0
      root.current.scale.setScalar(1)
    } else {
      root.current.position.y = ORB.y + Math.sin(clock.elapsedTime * speed) * .028
      root.current.rotation.y = clock.elapsedTime * .018
      root.current.scale.setScalar(1)
    }
    if (authoredCore.current) {
      const pulse = staticPresentation ? .34 : state === 'speaking' ? .37 : state === 'listening' ? .355 : .34 + Math.sin(clock.elapsedTime * .95) * .008
      authoredCore.current.scale.setScalar(pulse)
    }
    if (light.current) {
      const pulse = staticPresentation ? 0 : Math.sin(clock.elapsedTime * speed) * .13
      light.current.intensity = sensory.light.intensity * 2.28 + pulse
    }
  })

  return <group ref={root} name="home-orb-sanctuary" position={ORB} onClick={(event) => { event.stopPropagation(); onOpen() }} userData={{ orbState: state, animation: sensory.animation, modelClip: ORB_CLIPS[state], modelPlayback: staticPresentation ? 'stopped' : 'playing', runtimeAsset: ORB_MODEL, material: sensory.material, movement: sensory.movement, materialLanguage: 'translucent-living-memory-heart-with-visible-authored-core' }}>
    <mesh castShadow receiveShadow rotation={[.24,.5,-.12]}>
      <sphereGeometry args={[.43,48,32]} />
      <meshPhysicalMaterial color={palette.core} transparent opacity={0.14} depthWrite={false} emissive={palette.emissive} emissiveIntensity={reducedStimulation ? .12 : state === 'speaking' ? .3 : .18} roughness={.18} metalness={0} clearcoat={.45} clearcoatRoughness={.2} envMapIntensity={.72} />
    </mesh>
    <group ref={authoredCore} scale={.34}><primitive object={authoredOrb} /></group>
    <mesh name="orb-luminous-memory-volume"><sphereGeometry args={[.23,32,24]} /><meshStandardMaterial color={palette.aura} transparent opacity={.62} depthWrite={false} emissive={palette.emissive} emissiveIntensity={reducedStimulation ? .5 : state === 'speaking' ? 1.8 : 1.4} roughness={.28} metalness={0} toneMapped={false} /></mesh>
    <mesh name="orb-warm-memory-heart" position={[.06,-.03,.08]}><sphereGeometry args={[.1,24,16]} /><meshStandardMaterial color="#ffe1a3" emissive="#efbe64" emissiveIntensity={reducedStimulation ? .5 : 1.1} roughness={.3} metalness={0} toneMapped={false} /></mesh>
    {sensory.particles !== 'none' ? <OrbMotes reducedMotion={reducedMotion} color={palette.light} /> : null}
    <pointLight ref={light} color={palette.light} intensity={sensory.light.intensity * 2.28} distance={state === 'speaking' ? 12 : 10} decay={2} />
  </group>
}

function Orb({ onOpen, reducedMotion, reducedStimulation, state }: { onOpen: () => void; reducedMotion: boolean; reducedStimulation: boolean; state: OrbState }) {
  return <SacredOrb onOpen={onOpen} reducedMotion={reducedMotion} reducedStimulation={reducedStimulation} state={state} />
}

function OrbPlatform() {
  return <group name="home-orb-grounded-clearing-marker" position={[ORB.x, terrainHeight(ORB.x, ORB.z), ORB.z]} userData={{ treatment: 'level-natural-clearing-no-pedestal-or-ring' }} />
}

function EmbodiedPresence({ root }: { root: MutableRefObject<THREE.Group | null> }) {
  return <group ref={root} name="home-authored-embodied-self" position={SPAWN} userData={{ representation: 'privacy-preserving-first-person-presence' }}>
    <mesh position={[0,.012,-.52]} rotation={[-Math.PI/2,0,0]} scale={[.52,1.2,1]}><circleGeometry args={[.36,40]} /><meshBasicMaterial color="#020806" transparent opacity={.12} depthWrite={false} /></mesh>
  </group>
}

function Thresholds({ onGround, onLifeMap }: { onGround: () => void; onLifeMap: () => void }) {
  return <>
    <group name="home-ground-environmental-threshold" position={GROUND_THRESHOLD}><mesh position={[0,.8,0]} onClick={(e) => { e.stopPropagation(); onGround() }}><boxGeometry args={[4.2,2.8,4.2]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh></group>
    <group name="home-life-map-sky-lookout" position={LIFE_MAP_LOOKOUT}><mesh position={[0,.8,0]} onClick={(e) => { e.stopPropagation(); onLifeMap() }}><boxGeometry args={[4.2,2.8,4.2]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh></group>
  </>
}

function PlayerRig({ input, yaw, pitch, target, avatar, onNearby, groundDescent, reducedMotion, onGroundComplete, onTransitionSequence }: { input: MovementInput; yaw: MutableRefObject<number>; pitch: MutableRefObject<number>; target: MutableRefObject<THREE.Vector3 | null>; avatar: MutableRefObject<THREE.Group | null>; onNearby: (value: Nearby) => void; groundDescent: boolean; reducedMotion: boolean; onGroundComplete: () => void; onTransitionSequence: (value: TransitionSequence) => void }) {
  const { camera, size } = useThree()
  const position = useRef(SPAWN.clone())
  const velocity = useRef(new THREE.Vector3())
  const lastNearby = useRef<Nearby>(null)
  const transitionStarted = useRef<number | null>(null)
  const transitionIssued = useRef(false)
  const lastTransitionSequence = useRef<TransitionSequence>('idle')
  const desired = useRef(new THREE.Vector3())
  const forward = useRef(new THREE.Vector3(0,0,-1))
  const look = useRef(new THREE.Vector3())

  const place = useCallback(() => {
    const portrait = size.height > size.width
    position.current.y = homeWalkSurfaceHeight(position.current.x, position.current.z)
    camera.position.copy(position.current).add(new THREE.Vector3(0, portrait ? 1.58 : 1.68, .14))
    forward.current.set(Math.sin(yaw.current),0,-Math.cos(yaw.current))
    look.current.copy(position.current).addScaledVector(forward.current, portrait ? 6 : 8)
    camera.lookAt(look.current.x, position.current.y + 1.22 + pitch.current, look.current.z)
  }, [camera, pitch, size.height, size.width, yaw])
  useLayoutEffect(() => place(), [place])

  useFrame(({ clock }, delta) => {
    const store = useSceneStore.getState()
    const ascending = store.phase === 'ASCENT'
    if (groundDescent || ascending) {
      if (transitionStarted.current === null) transitionStarted.current = clock.elapsedTime
      const duration = reducedMotion ? .42 : ascending ? ASCENT_DURATION_SECONDS : GROUND_DESCENT_DURATION_SECONDS
      const t = THREE.MathUtils.smootherstep(THREE.MathUtils.clamp((clock.elapsedTime - transitionStarted.current) / duration, 0, 1), 0, 1)
      const sequence: TransitionSequence = ascending
        ? t < .16 ? 'life-map:opening' : t < .84 ? 'life-map:traversal' : 'life-map:closing'
        : t < .16 ? 'ground:opening' : t < .84 ? 'ground:traversal' : 'ground:closing'
      if (sequence !== lastTransitionSequence.current) { lastTransitionSequence.current = sequence; onTransitionSequence(sequence) }
      if (ascending) {
        camera.position.lerp(new THREE.Vector3(0, 44, -54), 1 - Math.pow(.0018, delta))
        camera.lookAt(0, 20 + t * 28, -38 - t * 24)
        store.setProgress(t)
        if (t >= 1 && !transitionIssued.current) { transitionIssued.current = true; requestUraiWorldTravel({ destination: 'life-map', href: '/life-map/?from=home-sky', entryPortal: 'home-sky', cameraCheckpoint: 'home-sky-ascent-complete' }) }
      } else {
        camera.position.lerp(new THREE.Vector3(-5.3, -2.4, -16.5), 1 - Math.pow(.002, delta))
        camera.lookAt(-5.4, -1.2, -18)
        store.setProgress(t)
        if (t >= 1 && !transitionIssued.current) { transitionIssued.current = true; onGroundComplete() }
      }
      return
    }
    transitionStarted.current = null
    transitionIssued.current = false
    if (lastTransitionSequence.current !== 'idle') { lastTransitionSequence.current = 'idle'; onTransitionSequence('idle') }
    stepEmbodiedMotion({ delta, input, yaw: yaw.current, position: position.current, velocity: velocity.current, target, bounds: HOME_BOUNDS, obstacles: HOME_NAVIGATION_OBSTACLES, speed: 3.15, acceleration: 9, deceleration: 12 })
    resolveHomeSolidPenetration(position.current)
    position.current.y = homeWalkSurfaceHeight(position.current.x, position.current.z)
    if (target.current && position.current.distanceTo(target.current) < .2) target.current = null
    if (avatar.current) { avatar.current.position.copy(position.current); avatar.current.rotation.y = yaw.current }
    const portrait = size.height > size.width
    forward.current.set(Math.sin(yaw.current),0,-Math.cos(yaw.current))
    desired.current.copy(position.current).add(new THREE.Vector3(0, portrait ? 1.58 : 1.68, .14))
    camera.position.lerp(desired.current, 1 - Math.pow(.001, delta))
    look.current.copy(position.current).addScaledVector(forward.current, portrait ? 6 : 8)
    camera.lookAt(look.current.x, position.current.y + 1.22 + pitch.current, look.current.z)
    const candidates: readonly [Nearby, THREE.Vector3, number][] = [['orb', ORB, 2.4], ['ground', GROUND_THRESHOLD, 2.8], ['life-map', LIFE_MAP_LOOKOUT, 2.8]]
    let next: Nearby = null, best = Infinity
    for (const [name, poi, radius] of candidates) { const distance = Math.hypot(position.current.x - poi.x, position.current.z - poi.z); if (distance < radius && distance < best) { next = name; best = distance } }
    if (next !== lastNearby.current) {
      const previousNearby = lastNearby.current
      lastNearby.current = next
      if (next === 'orb' && previousNearby !== 'orb') {
        const dx = ORB.x - position.current.x
        const dz = ORB.z - position.current.z
        if (Math.hypot(dx, dz) > 0.001) {
          // Give the physical Orb one production-facing attention handoff when the
          // user actually enters its proximity radius. This is not a camera lock:
          // pointer/touch look remains authoritative immediately afterward.
          yaw.current = Math.atan2(dx, -dz)
          pitch.current = THREE.MathUtils.clamp(ORB.y - position.current.y - 1.22, -.42, .18)
          forward.current.set(Math.sin(yaw.current), 0, -Math.cos(yaw.current))
          look.current.copy(position.current).addScaledVector(forward.current, portrait ? 6 : 8)
          camera.lookAt(look.current.x, position.current.y + 1.22 + pitch.current, look.current.z)
        }
      }
      onNearby(next)
    }
  })
  return null
}

function SceneReady({ onReady }: { onReady: () => void }) {
  const { scene } = useThree(); const frames = useRef(0); const done = useRef(false)
  useFrame(() => { if (done.current || ++frames.current < 4) return; const required = ['home-authored-terrain','home-authored-embodied-self','home-orb-sanctuary','home-ground-environmental-threshold','home-life-map-sky-lookout','home-mountain-horizon','home-living-vegetation','home-sanctuary-pavilion','home-sanctuary-path']; if (!required.every((name) => scene.getObjectByName(name))) return; done.current = true; onReady() })
  return null
}

function Scene(props: { input: MovementInput; yaw: MutableRefObject<number>; pitch: MutableRefObject<number>; target: MutableRefObject<THREE.Vector3 | null>; avatar: MutableRefObject<THREE.Group | null>; onNearby: (value: Nearby) => void; onOrbOpen: () => void; onGround: () => void; onGroundComplete: () => void; onLifeMap: () => void; onReady: () => void; onTransitionSequence: (value: TransitionSequence) => void; groundDescent: boolean; reducedMotion: boolean; reducedStimulation: boolean; orbState: OrbState }) {
  const phase = useSceneStore((state) => state.phase)
  const cosmic = phase === 'ASCENT'
  return <>
    <color attach="background" args={[cosmic ? '#01050b' : '#304f4b']} />
    {!cosmic ? <HomeSkyGradient /> : null}
    <Stars radius={190} depth={90} count={cosmic ? 2200 : 220} factor={cosmic ? 2.7 : .58} saturation={.12} fade speed={props.reducedMotion ? 0 : .02} />
    <fogExp2 attach="fog" args={[cosmic ? '#050b14' : '#2a4540', cosmic ? .0017 : .0048]} />
    <ambientLight intensity={cosmic ? .13 : .28} color="#d9e7dc" />
    <hemisphereLight args={['#c8dddc','#273126',cosmic ? .22 : .62]} />
    <directionalLight position={[8,18,7]} intensity={cosmic ? .34 : 1.85} color="#f2ecd8" castShadow shadow-mapSize={[1024,1024]} shadow-camera-left={-18} shadow-camera-right={18} shadow-camera-top={18} shadow-camera-bottom={-18} shadow-camera-near={1} shadow-camera-far={60} shadow-normalBias={.025} shadow-bias={-.00015} />
    <directionalLight position={[-10,7,-8]} intensity={cosmic ? .1 : .22} color="#bacac4" />
    {!cosmic ? <Environment resolution={128} frames={1} background={false}>
      <Lightformer form="rect" intensity={1.7} color="#f0dfbd" position={[0,8,5]} scale={[18,8,1]} />
      <Lightformer form="rect" intensity={1.15} color="#8fbeb7" position={[-8,4,-6]} rotation={[0,Math.PI/3,0]} scale={[10,5,1]} />
      <Lightformer form="ring" intensity={.75} color="#d7ece7" position={[7,5,-8]} scale={6} />
    </Environment> : null}
    {!cosmic ? <>
      <pointLight position={[-4.1,2.2,-3.9]} color="#d6a56c" intensity={.3} distance={6} decay={2} />
      <pointLight position={[4.3,2.1,-4.2]} color="#a5c9c3" intensity={.22} distance={6} decay={2} />
    </> : null}
    {HOME_INTERPRETIVE_SPLAT_ASSET ? <HomeInterpretiveSplatEnvironment src={HOME_INTERPRETIVE_SPLAT_ASSET} /> : null}
    <Terrain target={props.target} />
    <SanctuaryPath />
    <Horizon />
    <Vegetation />
    <GroundDetail />
    <SanctuaryPavilion />
    <Water />
    {!cosmic ? <ContactShadows position={[0, terrainHeight(0,-4.4) + .04, -4.4]} opacity={.32} scale={22} blur={2.8} far={8} frames={1} /> : null}
    <OrbPlatform />
    <OrbGroundGlow state={props.orbState} />
    <Orb onOpen={props.onOrbOpen} reducedMotion={props.reducedMotion} reducedStimulation={props.reducedStimulation} state={props.orbState} />
    <EmbodiedPresence root={props.avatar} />
    <Thresholds onGround={props.onGround} onLifeMap={props.onLifeMap} />
    <PlayerRig input={props.input} yaw={props.yaw} pitch={props.pitch} target={props.target} avatar={props.avatar} onNearby={props.onNearby} groundDescent={props.groundDescent} reducedMotion={props.reducedMotion} onGroundComplete={props.onGroundComplete} onTransitionSequence={props.onTransitionSequence} />
    <SceneReady onReady={props.onReady} />
  </>
}

export function HomeWorldProductionPolished({ onOrbOpen = requestUraiWorldOrbOpen, webglAvailable = true, onSceneFailure }: Props) {
  const quality = useAdaptiveSpatialQuality()
  const [canvasReady, setCanvasReady] = useState(false)
  const [sceneReady, setSceneReady] = useState(false)
  const [nearby, setNearby] = useState<Nearby>(null)
  const [dragging, setDragging] = useState(false)
  const [groundDescent, setGroundDescent] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [reducedStimulation, setReducedStimulation] = useState(false)
  const [mobileControls, setMobileControls] = useState(false)
  const [orbState, setOrbState] = useState<OrbState>('idle')
  const [reviewFixture, setReviewFixture] = useState<'none' | 'safe-private'>('none')
  const [portalSequence, setPortalSequence] = useState<TransitionSequence>('idle')
  const phase = useSceneStore((state) => state.phase)
  const progress = useSceneStore((state) => state.progress)
  const inputLocked = useSceneStore((state) => state.inputLocked)
  const yaw = useRef(.055), pitch = useRef(-.04), target = useRef<THREE.Vector3 | null>(null), avatar = useRef<THREE.Group | null>(null)

  const openOrb = useCallback(() => { if (!useSceneStore.getState().inputLocked && !groundDescent) { setOrbState('attention'); onOrbOpen() } }, [groundDescent, onOrbOpen])
  const startGround = useCallback(() => { if (useSceneStore.getState().inputLocked || groundDescent) return; target.current = null; setOrbState('transition'); setPortalSequence('ground:opening'); setGroundDescent(true) }, [groundDescent])
  const finishGround = useCallback(() => requestUraiWorldTravel({ destination: 'infrastructure-hub', href: '/ground/', entryPortal: 'home-ground', cameraCheckpoint: 'home-ground-descent' }), [])
  const startLifeMap = useCallback(() => {
    const store = useSceneStore.getState()
    if (store.inputLocked || groundDescent || store.phase === 'ASCENT') return
    target.current = null
    setOrbState('transition')
    setPortalSequence('life-map:opening')
    store.enterLifeMap()
    window.requestAnimationFrame(() => {
      if (useSceneStore.getState().phase === 'ASCENT') setPortalSequence('life-map:traversal')
    })
  }, [groundDescent])
  const interact = useCallback(() => { if (nearby === 'orb') openOrb(); else if (nearby === 'ground') startGround(); else if (nearby === 'life-map') startLifeMap() }, [nearby, openOrb, startGround, startLifeMap])
  const reset = useCallback(() => { if (!groundDescent) { yaw.current = .055; pitch.current = -.04; target.current = SPAWN.clone() } }, [groundDescent])
  const input = useMovementInput({ enabled: !groundDescent, onInteract: interact, onReset: reset })
  const look = useDragLook({ yaw, pitch, enabled: !groundDescent && phase !== 'ASCENT', sensitivity: .0031, minPitch: -.55, maxPitch: .68, onDragState: setDragging })

  useEffect(() => { const reduced = window.matchMedia('(prefers-reduced-motion: reduce)'); const mobile = window.matchMedia('(pointer: coarse), (max-width: 700px)'); const apply = () => { setReducedMotion(reduced.matches); setMobileControls(mobile.matches) }; apply(); reduced.addEventListener?.('change', apply); mobile.addEventListener?.('change', apply); return () => { reduced.removeEventListener?.('change', apply); mobile.removeEventListener?.('change', apply) } }, [])
  useEffect(() => {
    setReducedStimulation(sensorySafeEnabled())
    const onSensory = (event: CustomEvent<{ enabled: boolean }>) => setReducedStimulation(event.detail.enabled === true)
    const onStorage = (event: StorageEvent) => {
      if (event.key === URAI_SENSORY_SAFE_STORAGE_KEY || event.key === null) setReducedStimulation(sensorySafeEnabled())
    }
    window.addEventListener(URAI_SENSORY_SAFE_EVENT, onSensory)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(URAI_SENSORY_SAFE_EVENT, onSensory)
      window.removeEventListener('storage', onStorage)
    }
  }, [])
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setReviewFixture(params.get('homePrivateFixture') === '1' ? 'safe-private' : 'none')
    const requestedOrbState = params.get('homeOrbState')
    if (isOrbState(requestedOrbState)) setOrbState(requestedOrbState)
  }, [])
  useEffect(() => {
    const onOrbState = (event: CustomEvent<OrbStateEventDetail>) => {
      if (phase === 'ASCENT' || groundDescent || !isOrbState(event.detail?.state)) return
      setOrbState(event.detail.state)
    }
    window.addEventListener(URAI_ORB_STATE_EVENT, onOrbState)
    return () => window.removeEventListener(URAI_ORB_STATE_EVENT, onOrbState)
  }, [groundDescent, phase])
  useEffect(() => { if (phase !== 'ASCENT' && !groundDescent) setOrbState('idle') }, [groundDescent, phase])
  useEffect(() => { const cancel = (event: KeyboardEvent) => { if (event.key !== 'Escape') return; const store = useSceneStore.getState(); if (store.phase === 'ASCENT') { event.preventDefault(); store.setPhase('HOME'); store.unlock(); setPortalSequence('idle'); setOrbState('idle') } else if (groundDescent) { event.preventDefault(); setGroundDescent(false); setPortalSequence('idle'); setOrbState('idle') } }; window.addEventListener('keydown', cancel, true); return () => window.removeEventListener('keydown', cancel, true) }, [groundDescent])

  if (!webglAvailable) return null
  const ready = canvasReady && sceneReady
  const transitioning = phase === 'ASCENT' || groundDescent
  const orbSensory = resolveOrbSensoryOutput(orbState, reducedMotion, true, reducedStimulation)
  const context = phase === 'ASCENT' ? 'Ascending through the sky' : groundDescent ? 'Descending into Ground' : nearby === 'orb' ? 'The Orb is here' : nearby === 'ground' ? 'The path descends' : nearby === 'life-map' ? 'Look to the sky' : null

  return <main className={`${styles.world} urai-asset-home-world`} data-urai-home-production data-urai-true-3d="true" data-home-primary-owner="asset-driven" data-home-real-world-first="true" data-home-visible-world="authored-coherent-three-dimensional-sanctuary" data-home-world-character="believable-natural-inhabitable-environment" data-home-visible-portals="false" data-home-transition-affordances="ground-environmental-descent life-map-sky-lookout" data-home-provider-environment={HOME_PROVIDER_ENVIRONMENT} data-home-provider-role="legacy-placeholder-metadata-only" data-home-provider-regions="not-rendered" data-home-generated-scenery="suppressed" data-home-physical-base="authored-coherent-world" data-home-visual-ownership="three-dimensional-geometry" data-home-desktop-mobile-world="same-scene" data-home-embodied-self="privacy-preserving-shadow" data-home-movement="walk-keyboard-click-touch" data-home-pointer-lock="false" data-home-audio="production-opus-consent-controlled" data-home-assets-ready={ready ? 'true' : 'false'} data-home-runtime-assets="home-entry-chamber-v1.glb polyhaven-fern-02-geometry-v1.glb local-three-dimensional-terrain living-orb reflecting-water" data-home-authored-regions="home-canonical-sanctuary-structure home-sanctuary-geometry home-mountain-horizon home-living-vegetation home-reflecting-water" data-home-nearby={nearby ?? 'none'} data-home-camera-mode={groundDescent ? 'descent' : phase === 'ASCENT' ? 'ascent' : dragging ? 'look' : 'embodied-first-person'} data-home-scene-phase={groundDescent ? 'GROUND_DESCENT' : phase} data-home-ascent-progress={phase === 'ASCENT' ? progress.toFixed(3) : '0.000'} data-home-input-locked={transitioning || inputLocked ? 'true' : 'false'} data-home-portal-sequence={portalSequence} data-home-portal-lifecycle="environmental-approach-traversal-arrival" data-home-review-fixture={reviewFixture} data-home-orb-state={orbState} data-home-orb-clip={ORB_CLIPS[orbState]} data-home-orb-animation={orbSensory.animation} data-home-orb-material={orbSensory.material} data-home-orb-movement={orbSensory.movement} data-home-orb-caption={orbSensory.caption} data-home-orb-reduced-motion={reducedMotion ? 'true' : 'false'} data-home-orb-reduced-stimulation={reducedStimulation ? 'true' : 'false'} data-home-orb-playback={orbSensory.movement === 'settled' ? 'stopped' : 'playing'} data-home-animation-owner={HOME_SCANNED_COMPOSITION_V1} data-testid="home-visible-navigable-sanctuary-world" style={{ position:'relative', overflow:'hidden', background:'#172c27' }} {...look}>
    <div style={{ position:'absolute', inset:0, zIndex:1 }}><Canvas className={styles.canvas} dpr={[1,Math.min(1.35,quality.pixelRatioMax)]} shadows={quality.shadows} frameloop={quality.documentVisible ? 'always' : 'never'} camera={{ position:[SPAWN.x,1.68,SPAWN.z], fov:50, near:.05, far:300 }} gl={{ antialias:quality.antialias, alpha:false, powerPreference:'high-performance' }} onCreated={({ gl }) => { gl.outputColorSpace = THREE.SRGBColorSpace; gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.22; gl.shadowMap.type = THREE.PCFSoftShadowMap; setCanvasReady(true) }}><HomeSceneAssetBoundary onFailure={onSceneFailure}><Scene input={input} yaw={yaw} pitch={pitch} target={target} avatar={avatar} onNearby={setNearby} onOrbOpen={openOrb} onGround={startGround} onGroundComplete={finishGround} onLifeMap={startLifeMap} onReady={() => setSceneReady(true)} onTransitionSequence={setPortalSequence} groundDescent={groundDescent} reducedMotion={reducedMotion} reducedStimulation={reducedStimulation} orbState={orbState} /></HomeSceneAssetBoundary></Canvas></div>
    <header className={styles.brand} aria-label="URAI" style={{ zIndex:3 }}><strong>URAI</strong></header>
    {context ? <div className={`${styles.worldHint} home-world-context`} role="status" aria-live="polite" style={{ zIndex:3 }}>{context}</div> : null}
    {!transitioning && mobileControls ? <MobileMovementPad input={input} label="Home movement controls" /> : null}
    <span className="sr-only" data-testid="urai-home-webgl-orb">The Orb companion is physically present in the Home environment.</span>
    <span className="sr-only" data-testid="urai-home-embodied-avatar">Your privacy-preserving embodied presence is represented without fabricating personal identity.</span>
  </main>
}

export function clearHomeAssetCache() {
  for (const asset of [HOME_SANCTUARY_MODEL, HOME_FERN_MODEL, ORB_MODEL]) useGLTF.clear(asset)
}

export function isHomeAssetLoadError(error: Error) {
  return [HOME_SANCTUARY_MODEL, HOME_FERN_MODEL, ORB_MODEL].some((asset) => error.message.includes(asset))
}

useGLTF.preload(HOME_SANCTUARY_MODEL)
useGLTF.preload(HOME_FERN_MODEL)
useGLTF.preload(ORB_MODEL)
