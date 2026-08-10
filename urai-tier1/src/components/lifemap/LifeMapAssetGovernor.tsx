'use client'

import { useGLTF } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'

const MEMORY_STAR_MODEL = '/assets/urai/generated/models/life-map-memory-star-v1.glb'

function numericSuffix(name: string, marker: string) {
  const match = name.toLowerCase().match(new RegExp(`${marker}-(\\d+)`))
  return match ? Number(match[1]) : null
}

function governMemoryStar(scene: THREE.Object3D) {
  scene.traverse((object) => {
    const name = object.name.toLowerCase()
    const orbit = numericSuffix(name, 'memory-star-orbit')
    const shard = numericSuffix(name, 'memory-star-shard')

    // The original production GLB carries seven full orbital tubes and eighteen
    // shards. Repeating that complete silhouette for every chapter, landmark,
    // and memory creates the unreadable wire mass seen in the production audit.
    // Keep one defining orbit and four sparse shards; semantic runtime geometry
    // supplies the richer relationship/path language around selected memories.
    if (orbit !== null && orbit > 1) object.visible = false
    if (shard !== null && ![1, 6, 11, 16].includes(shard)) object.visible = false

    if (object instanceof THREE.Mesh) {
      object.castShadow = false
      object.receiveShadow = false
      object.frustumCulled = true
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      for (const material of materials) {
        if (material instanceof THREE.MeshStandardMaterial) {
          material.transparent = material.transparent || material.opacity < 1
          if (orbit !== null) material.opacity = Math.min(material.opacity, 0.58)
          if (shard !== null) material.opacity = Math.min(material.opacity, 0.72)
          material.needsUpdate = true
        }
      }
    }
  })
  scene.userData.lifeMapVisualDensity = 'semantic-calm'
  scene.userData.lifeMapDecorativeOrbitCount = 1
  scene.userData.lifeMapDecorativeShardCount = 4
  return scene
}

export default function LifeMapAssetGovernor() {
  const { scene } = useGLTF(MEMORY_STAR_MODEL)
  useMemo(() => governMemoryStar(scene), [scene])
  return null
}

useGLTF.preload(MEMORY_STAR_MODEL)
