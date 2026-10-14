'use client'

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { buildReplayLeafSprayGeometry } from '@/app/replay/replayBotanicalGeometry'
import { makeReplaySurfaceTextures } from '@/app/replay/replaySurfaceTextures'
import { homeTerrainHeight } from './HomeSanctuaryGeometry'
import {
  HOME_PERIMETER_TREE_COUNT as TREE_COUNT,
  HOME_PERIMETER_BRANCHES_PER_TREE as BRANCHES,
  HOME_PERIMETER_LEAF_CLUSTERS_PER_TREE as LEAF_CLUSTERS,
  homePerimeterTreePlacement,
  homePerimeterVariation as variation,
} from './homePerimeterGrovePlacement'

// Instanced, physically three-dimensional woodland at the sanctuary boundary.
// This is honest source-authored non-admitted landscaping, not a captured forest.
// The walkable first-person interior and its canonical navigation remain intact.
// Three bounded crown variants reuse the same instanced meshes and draw calls.
const GROVE_FORMS = [
  { height: 3.65, spread: 1.35, crownBase: .58 },
  { height: 4.98, spread: .87, crownBase: .72 },
  { height: 4.27, spread: 1.12, crownBase: .65 },
] as const
export default function HomeSanctuaryPerimeterGrove() {
  const trunks = useRef<THREE.InstancedMesh>(null)
  const boughs = useRef<THREE.InstancedMesh>(null)
  const foliage = useRef<THREE.InstancedMesh>(null)
  const leafGeometry = useMemo(() => buildReplayLeafSprayGeometry(), [])
  const bark = useMemo(() => makeReplaySurfaceTextures('bark'), [])
  useEffect(() => () => { leafGeometry.dispose(); bark.dispose() }, [leafGeometry, bark])

  useLayoutEffect(() => {
    if (!trunks.current || !boughs.current || !foliage.current) return
    const transform = new THREE.Object3D()
    const direction = new THREE.Vector3()
    const up = new THREE.Vector3(0, 1, 0)
    const tint = new THREE.Color()
    for (let index = 0; index < TREE_COUNT; index++) {
      const tree = homePerimeterTreePlacement(index)
      const form = GROVE_FORMS[tree.crownProfile]
      const ground = homeTerrainHeight(tree.x, tree.z)
      const height = (form.height + variation(index, 51) * 1.45) * tree.scale
      transform.position.set(tree.x, ground + height * .5, tree.z)
      transform.rotation.set(tree.lean * .25, tree.yaw, tree.lean)
      transform.scale.set(tree.scale, height, tree.scale)
      transform.updateMatrix()
      trunks.current.setMatrixAt(index, transform.matrix)
      trunks.current.setColorAt(index, tint.set('#655446').lerp(new THREE.Color('#98806a'), variation(index, 52) * .68))

      for (let branch = 0; branch < BRANCHES; branch++) {
        const id = index * BRANCHES + branch
        const angle = tree.yaw + branch * Math.PI * 2 / BRANCHES + variation(id, 53) * .38
        const reach = (.95 + variation(id, 54) * .75) * tree.scale * form.spread
        const stemHeight = ground + height * (form.crownBase - .12 + branch * .066)
        direction.set(Math.cos(angle) * .84, .37 + variation(id, 55) * .27, Math.sin(angle) * .84).normalize()
        transform.position.set(tree.x + direction.x * reach * .44, stemHeight + direction.y * reach * .44, tree.z + direction.z * reach * .44)
        transform.quaternion.setFromUnitVectors(up, direction)
        transform.scale.set(tree.scale * .68, reach, tree.scale * .68)
        transform.updateMatrix()
        boughs.current.setMatrixAt(id, transform.matrix)
        boughs.current.setColorAt(id, tint.set('#635244').lerp(new THREE.Color('#8e765f'), variation(id, 56) * .68))
      }

      for (let cluster = 0; cluster < LEAF_CLUSTERS; cluster++) {
        const id = index * LEAF_CLUSTERS + cluster
        const branch = cluster % BRANCHES
        const angle = tree.yaw + branch * Math.PI * 2 / BRANCHES + (variation(id, 57) - .5) * 1.55
        const spread = (.58 + variation(id, 58) * 1.18) * tree.scale * form.spread
        const canopyY = ground + height * (form.crownBase + variation(id, 59) * (.99 - form.crownBase))
        const density = (.54 + variation(id, 60) * .49) * tree.scale
        transform.position.set(tree.x + Math.cos(angle) * spread, canopyY, tree.z + Math.sin(angle) * spread)
        transform.rotation.set((variation(id, 61) - .5) * .49, angle, (variation(id, 62) - .5) * .49)
        transform.scale.set(density * (1.02 + variation(id, 65) * .35), density * (.69 + variation(id, 63) * .59), density * (.96 + variation(id, 66) * .28))
        transform.updateMatrix()
        foliage.current.setMatrixAt(id, transform.matrix)
        tint.set(index % 5 === 0 ? '#81946a' : '#526e4b').lerp(new THREE.Color('#2f4b3b'), variation(id, 64) * .64)
        foliage.current.setColorAt(id, tint)
      }
    }
    for (const mesh of [trunks.current, boughs.current, foliage.current]) {
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
      mesh.computeBoundingSphere()
    }
  }, [])

  return <group name="home-perimeter-grove" userData={{
    truthClass: 'authored-non-admitted-landscaping',
    source: 'deterministic-clustered-woodland-authored-crown-variants-shared-physical-foliage-and-bark',
    finalArtAdmitted: false,
    collisionAuthority: false,
    rootPlacement: 'outside-first-person-walking-bounds',
  }}>
    <instancedMesh ref={trunks} args={[undefined, undefined, TREE_COUNT]} castShadow receiveShadow name="home-perimeter-tree-trunks">
      <cylinderGeometry args={[.082, .19, 1, 10, 5]} />
      <meshStandardMaterial color="#fff" map={bark.color} normalMap={bark.normal} roughness={.96} metalness={0} />
    </instancedMesh>
    <instancedMesh ref={boughs} args={[undefined, undefined, TREE_COUNT * BRANCHES]} castShadow receiveShadow name="home-perimeter-tree-boughs">
      <cylinderGeometry args={[.045, .125, 1, 8, 3]} />
      <meshStandardMaterial color="#fff" map={bark.color} normalMap={bark.normal} roughness={.97} metalness={0} />
    </instancedMesh>
    <instancedMesh ref={foliage} args={[leafGeometry, undefined, TREE_COUNT * LEAF_CLUSTERS]} castShadow receiveShadow name="home-perimeter-tree-foliage">
      <meshStandardMaterial color="#fff" vertexColors roughness={.95} metalness={0} side={THREE.DoubleSide} />
    </instancedMesh>
  </group>
}
