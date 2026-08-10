'use client'

import { useGLTF } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'

const MEMORY_STAR_MODEL = '/assets/urai/generated/models/life-map-memory-star-v1.glb'

function governMemoryStar(scene: THREE.Object3D) {
  let visibleCoreMeshes = 0
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    const name = object.name.toLowerCase()
    const keep = /core|heart|center/.test(name)

    // The authored GLB is intentionally rich when inspected alone, but the
    // Life Map repeats it across chapters, landmarks, and memories. Rendering
    // every orbit, shard, petal, and shell at every node produced hundreds of
    // draw calls and the wire-mass seen in the audit. The repeated overview
    // identity is therefore the authored luminous core; relationship currents,
    // artifact-family geometry, particles, and the selected chamber carry the
    // surrounding semantic structure.
    object.visible = keep
    object.castShadow = false
    object.receiveShadow = false
    object.frustumCulled = true
    if (keep) visibleCoreMeshes += 1
  })

  // Fail visibly rather than accidentally blanking an unexpected replacement
  // asset. A future reviewed GLB with different node naming remains intact.
  if (visibleCoreMeshes === 0) {
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) object.visible = true
    })
    scene.userData.lifeMapVisualDensity = 'unrecognized-asset-preserved'
    return scene
  }

  scene.userData.lifeMapVisualDensity = 'semantic-core'
  scene.userData.lifeMapDecorativeOrbitCount = 0
  scene.userData.lifeMapDecorativeShardCount = 0
  scene.userData.lifeMapVisibleCoreMeshes = visibleCoreMeshes
  return scene
}

export default function LifeMapAssetGovernor() {
  const { scene } = useGLTF(MEMORY_STAR_MODEL)
  useMemo(() => governMemoryStar(scene), [scene])
  return null
}

useGLTF.preload(MEMORY_STAR_MODEL)
