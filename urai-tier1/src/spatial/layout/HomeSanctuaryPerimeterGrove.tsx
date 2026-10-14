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
      const ground = homeTerrainHeight(tree.x, tree.z)
      const height = (3.4 + variation(index, 51) * 2.8) * tree.scale
      const crownBias = variation(index, 68) * .24 - .12
      const trunkTaper = .76 + variation(index, 69) * .48
      transform.position.set(tree.x, ground + height * .5, tree.z)
      transform.rotation.set(0, tree.yaw, 0)
      transform.scale.set(tree.scale * trunkTaper, height, tree.scale * trunkTaper)
      transform.updateMatrix()
      trunks.current.setMatrixAt(index, transform.matrix)
      trunks.current.setColorAt(index, tint.set('#e6dbce').lerp(new THREE.Color('#bbac99'), variation(index, 52) * .22))

      for (let branch = 0; branch < BRANCHES; branch++) {
        const id = index * BRANCHES + branch
        const angle = tree.yaw + branch * Math.PI * 2 / BRANCHES + variation(id, 53) * .38
        const reach = (.80 + variation(id, 54) * 1.05) * tree.scale
        const stemHeight = ground + height * (.53 + branch * .068 + crownBias * .22)
        direction.set(Math.cos(angle) * .84, .37 + variation(id, 55) * .27, Math.sin(angle) * .84).normalize()
        transform.position.set(tree.x + direction.x * reach * .44, stemHeight + direction.y * reach * .44, tree.z + direction.z * reach * .44)
        transform.quaternion.setFromUnitVectors(up, direction)
        transform.scale.set(tree.scale * .68, reach, tree.scale * .68)
        transform.updateMatrix()
        boughs.current.setMatrixAt(id, transform.matrix)
        boughs.current.setColorAt(id, tint.set('#d7c7b6').lerp(new THREE.Color('#f1dec6'), variation(id, 56) * .22))
      }

      for (let cluster = 0; cluster < LEAF_CLUSTERS; cluster++) {
        const id = index * LEAF_CLUSTERS + cluster
        const branch = cluster % BRANCHES
        const angle = tree.yaw + branch * Math.PI * 2 / BRANCHES + (variation(id, 57) - .5) * 1.55
        const spread = (.42 + variation(id, 58) * 1.48) * tree.scale
        const canopyY = ground + height * (.65 + crownBias + variation(id, 59) * .43)
        const density = (.43 + variation(id, 60) * .62) * tree.scale
        transform.position.set(tree.x + Math.cos(angle) * spread, canopyY, tree.z + Math.sin(angle) * spread)
        transform.rotation.set((variation(id, 61) - .5) * .49, angle, (variation(id, 62) - .5) * .49)
        transform.scale.set(density * 1.13, density * (.84 + variation(id, 63) * .35), density * 1.13)
        transform.updateMatrix()
        foliage.current.setMatrixAt(id, transform.matrix)
        tint.set(index % 4 === 0 ? '#a4b994' : '#71977b').lerp(new THREE.Color('#496e58'), variation(id, 64) * .53)
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
    source: 'deterministic-instanced-woodland-shared-physical-foliage-and-bark',
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
