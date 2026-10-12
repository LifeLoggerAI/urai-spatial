'use client'

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { replayVariation, replayGroundPlacement, replayFernPlacement } from './replayEnvironmentPlacement'
import { buildReplayLeafSprayGeometry, buildReplayMeadowTuftGeometry } from './replayBotanicalGeometry'
import { makeReplaySurfaceTextures } from './replaySurfaceTextures'

type Elevation = (x: number, z: number) => number
type TreePosition = readonly [number, number, number]

export const REPLAY_CC0_FERN_MODEL = '/assets/urai/home-production/cc0/polyhaven-fern-02-geometry-v1.glb'
const GROVE_FOLIAGE_PER_TREE = 42
const GROVE_BRANCHES_PER_TREE = 5
const GROUND_GRASS_COUNT = 840
const GROUND_STONE_COUNT = 135
const SCANNED_FERN_COUNT = 52

// Physical mesh instances: all tree components share a few draw calls, with
// no per-frame CPU animation or extra camera ownership.
export function ReplayMemoryGrove({ trees, groundHeight }: {
  trees: readonly TreePosition[]
  groundHeight: Elevation
}) {
  const trunks = useRef<THREE.InstancedMesh>(null)
  const boughs = useRef<THREE.InstancedMesh>(null)
  const crowns = useRef<THREE.InstancedMesh>(null)
  const leafGeometry = useMemo(() => buildReplayLeafSprayGeometry(), [])
  const bark = useMemo(() => makeReplaySurfaceTextures('bark'), [])
  useEffect(() => () => { leafGeometry.dispose(); bark.dispose() }, [leafGeometry, bark])

  useLayoutEffect(() => {
    if (!trunks.current || !boughs.current || !crowns.current) return
    const dummy = new THREE.Object3D()
    const foliageColor = new THREE.Color()
    const branchColor = new THREE.Color()
    trees.forEach(([x, z, size], treeIndex) => {
      const ground = groundHeight(x, z)
      const trunkHeight = (2.6 + replayVariation(treeIndex, 61) * .62) * size
      dummy.position.set(x, ground + trunkHeight * .5, z)
      dummy.rotation.set(0, replayVariation(treeIndex, 62) * Math.PI * 2, 0)
      dummy.scale.set(size, trunkHeight, size)
      dummy.updateMatrix()
      trunks.current!.setMatrixAt(treeIndex, dummy.matrix)
      trunks.current!.setColorAt(treeIndex, branchColor.set('#d4c2ae').lerp(new THREE.Color('#efddc5'), replayVariation(treeIndex, 63) * .4))

      for (let branch = 0; branch < GROVE_BRANCHES_PER_TREE; branch++) {
        const id = treeIndex * GROVE_BRANCHES_PER_TREE + branch
        const angle = (branch / GROVE_BRANCHES_PER_TREE) * Math.PI * 2 + replayVariation(treeIndex, 64) * .55
        const branchHeight = ground + trunkHeight * (.57 + branch * .057)
        const length = (.8 + replayVariation(id, 65) * .48) * size
        dummy.position.set(x + Math.cos(angle) * length * .24, branchHeight, z + Math.sin(angle) * length * .24)
        dummy.rotation.set(Math.cos(angle) * .8, 0, Math.sin(angle) * .8)
        dummy.scale.set(size * .45, length, size * .45)
        dummy.updateMatrix()
        boughs.current!.setMatrixAt(id, dummy.matrix)
        boughs.current!.setColorAt(id, branchColor.set('#c0b4a1').lerp(new THREE.Color('#e7d4bd'), replayVariation(id, 66) * .35))
      }

      for (let cluster = 0; cluster < GROVE_FOLIAGE_PER_TREE; cluster++) {
        const id = treeIndex * GROVE_FOLIAGE_PER_TREE + cluster
        const angle = replayVariation(id, 67) * Math.PI * 2
        const spread = (.22 + replayVariation(id, 68) * 1.35) * size
        const height = ground + (2.2 + replayVariation(id, 69) * 2.05) * size
        const radius = (.36 + replayVariation(id, 70) * .34) * size
        dummy.position.set(x + Math.cos(angle) * spread, height, z + Math.sin(angle) * spread)
        dummy.rotation.set(replayVariation(id, 71) * .24, angle, replayVariation(id, 72) * .24)
        dummy.scale.set(radius * 1.1, radius * (1.1 + replayVariation(id, 73) * .5), radius)
        dummy.updateMatrix()
        crowns.current!.setMatrixAt(id, dummy.matrix)
        foliageColor.set('#2c4b3e').lerp(new THREE.Color('#698366'), replayVariation(id, 74) * .86)
        crowns.current!.setColorAt(id, foliageColor)
      }
    })
    for (const mesh of [trunks.current, boughs.current, crowns.current]) {
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
      mesh.computeBoundingSphere()
    }
  }, [trees, groundHeight])

  return <group name="replay-memory-grove" userData={{ truthClass: 'disclosed-demonstration', authoring: 'deterministic-instanced-forest' }}>
    <instancedMesh ref={trunks} args={[undefined, undefined, trees.length]} castShadow receiveShadow name="replay-memory-tree-trunks">
      <cylinderGeometry args={[.09, .20, 1, 12, 6]} />
      <meshStandardMaterial color="#ffffff" map={bark.color} normalMap={bark.normal} roughness={.94} metalness={0} />
    </instancedMesh>
    <instancedMesh ref={boughs} args={[undefined, undefined, trees.length * GROVE_BRANCHES_PER_TREE]} castShadow name="replay-memory-tree-branches">
      <cylinderGeometry args={[.045, .125, 1, 10, 4]} />
      <meshStandardMaterial color="#ffffff" map={bark.color} normalMap={bark.normal} roughness={.96} metalness={0} />
    </instancedMesh>
    <instancedMesh ref={crowns} args={[leafGeometry, undefined, trees.length * GROVE_FOLIAGE_PER_TREE]} castShadow receiveShadow name="replay-memory-canopy-clusters">
      <meshStandardMaterial color="#ffffff" vertexColors roughness={.9} metalness={0} side={THREE.DoubleSide} />
    </instancedMesh>
  </group>
}

export function ReplayForestFloor({ groundHeight }: { groundHeight: Elevation }) {
  const grass = useRef<THREE.InstancedMesh>(null)
  const tuftGeometry = useMemo(() => buildReplayMeadowTuftGeometry(), [])
  useEffect(() => () => tuftGeometry.dispose(), [tuftGeometry])
  const stones = useRef<THREE.InstancedMesh>(null)
  const rock = useMemo(() => makeReplaySurfaceTextures('stone'), [])
  useEffect(() => () => rock.dispose(), [rock])

  useLayoutEffect(() => {
    if (!grass.current || !stones.current) return
    const dummy = new THREE.Object3D()
    const tint = new THREE.Color()
    for (let index = 0; index < GROUND_GRASS_COUNT; index++) {
      const item = replayGroundPlacement(index)
      const height = (.25 + replayVariation(index, 81) * .5) * item.scale
      dummy.position.set(item.x, groundHeight(item.x, item.z) + height * .45, item.z)
      dummy.rotation.set((replayVariation(index, 82) - .5) * .3, item.yaw, (replayVariation(index, 83) - .5) * .35)
      dummy.scale.set(item.scale, height, item.scale)
      dummy.updateMatrix()
      grass.current.setMatrixAt(index, dummy.matrix)
      tint.set(index % 4 === 0 ? '#729075' : '#3c624a').lerp(new THREE.Color('#a0a280'), replayVariation(index, 84) * .32)
      grass.current.setColorAt(index, tint)
    }
    for (let index = 0; index < GROUND_STONE_COUNT; index++) {
      const item = replayGroundPlacement(index + GROUND_GRASS_COUNT)
      const size = .08 + replayVariation(index, 85) * .22
      dummy.position.set(item.x, groundHeight(item.x, item.z) + size * .28, item.z)
      dummy.rotation.set(replayVariation(index, 86) * .24, item.yaw, replayVariation(index, 87) * .2)
      dummy.scale.set(size * 1.3, size * .55, size)
      dummy.updateMatrix()
      stones.current.setMatrixAt(index, dummy.matrix)
      tint.set(index % 3 === 0 ? '#9b9d89' : '#676f65')
      stones.current.setColorAt(index, tint)
    }
    for (const mesh of [grass.current, stones.current]) {
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
      mesh.computeBoundingSphere()
    }
  }, [groundHeight])

  return <group name="replay-memory-forest-floor" userData={{ truthClass: 'disclosed-demonstration', drawCallStrategy: 'instanced-static-dressing' }}>
    <instancedMesh ref={grass} args={[tuftGeometry, undefined, GROUND_GRASS_COUNT]} receiveShadow name="replay-memory-grass-details">
      <meshStandardMaterial color="#ffffff" vertexColors roughness={.94} metalness={0} side={THREE.DoubleSide} />
    </instancedMesh>
    <instancedMesh ref={stones} args={[undefined, undefined, GROUND_STONE_COUNT]} receiveShadow name="replay-memory-forest-pebbles">
      <icosahedronGeometry args={[1, 1]} />
      <meshStandardMaterial color="#ffffff" map={rock.color} normalMap={rock.normal} roughness={.97} metalness={0} />
    </instancedMesh>
  </group>
}

function ReplayFernPart({ geometry, material, localMatrix, rootRotation, groundHeight, part }: {
  geometry: THREE.BufferGeometry
  material: THREE.Material | THREE.Material[]
  localMatrix: THREE.Matrix4
  rootRotation: THREE.Euler
  groundHeight: Elevation
  part: number
}) {
  const batch = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    if (!batch.current) return
    const dummy = new THREE.Object3D()
    const matrix = new THREE.Matrix4()
    const tint = new THREE.Color()
    for (let i = 0; i < SCANNED_FERN_COUNT; i++) {
      const item = replayFernPlacement(i)
      dummy.position.set(item.x, groundHeight(item.x, item.z) + .025, item.z)
      dummy.rotation.copy(rootRotation)
      dummy.rotation.y += item.yaw
      dummy.scale.setScalar(item.scale)
      dummy.updateMatrix()
      matrix.multiplyMatrices(dummy.matrix, localMatrix)
      batch.current.setMatrixAt(i, matrix)
      tint.set('#769875').lerp(new THREE.Color('#b5af86'), replayVariation(i + part * 19, 97) * .38)
      batch.current.setColorAt(i, tint)
    }
    batch.current.instanceMatrix.needsUpdate = true
    if (batch.current.instanceColor) batch.current.instanceColor.needsUpdate = true
    batch.current.computeBoundingSphere()
  }, [localMatrix, rootRotation, groundHeight, part])
  return <instancedMesh ref={batch} args={[geometry, material, SCANNED_FERN_COUNT]} dispose={null} castShadow receiveShadow name={'replay-cc0-fern-part-' + part} />
}

// Reuse the already-shipped, source-controlled Poly Haven CC0 scan geometry,
// not an invented final hero package and never an autobiographical reconstruction.
export function ReplayScannedUnderstory({ groundHeight }: { groundHeight: Elevation }) {
  const fern = useGLTF(REPLAY_CC0_FERN_MODEL)
  const pieces = useMemo(() => {
    const clone = fern.scene.clone(true)
    clone.updateMatrixWorld(true)
    const inverse = clone.matrixWorld.clone().invert()
    const result: { geometry: THREE.BufferGeometry; material: THREE.Material | THREE.Material[]; localMatrix: THREE.Matrix4 }[] = []
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) result.push({
        geometry: child.geometry,
        material: child.material,
        localMatrix: new THREE.Matrix4().multiplyMatrices(inverse, child.matrixWorld),
      })
    })
    return result
  }, [fern.scene])
  return <group name="replay-scanned-understory" userData={{ source: 'Poly Haven fern_02 CC0', truthClass: 'disclosed-demonstration', finalArtAdmitted: false }}>
    {pieces.map(({ geometry, material, localMatrix }, index) => <ReplayFernPart key={index} geometry={geometry} material={material} localMatrix={localMatrix} rootRotation={fern.scene.rotation} groundHeight={groundHeight} part={index} />)}
  </group>
}

useGLTF.preload(REPLAY_CC0_FERN_MODEL)
