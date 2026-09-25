import * as THREE from 'three'

/** Share draw calls without changing the governed fern geometry or placement. */
export function batchStaticFernPlants(plants: readonly THREE.Object3D[]): THREE.Object3D[] {
  // The current CC0 variants are single, static meshes. Keep the original plants
  // if a later asset introduces a hierarchy, skinning, or morph animation.
  if (!plants.every((plant): plant is THREE.Mesh => plant instanceof THREE.Mesh
    && !(plant instanceof THREE.SkinnedMesh)
    && !(plant instanceof THREE.InstancedMesh)
    && plant.children.length === 0
    && !plant.morphTargetInfluences
    && !Array.isArray(plant.material))) return [...plants]

  const groups = new Map<string, THREE.Mesh[]>()
  for (const plant of plants as readonly THREE.Mesh[]) {
    const material = plant.material as THREE.Material
    // Preserve the eight authored patch partitions for local frustum culling.
    const key = [plant.userData.canopyPatch, plant.geometry.uuid, material.uuid, plant.castShadow, plant.receiveShadow,
      plant.visible, plant.frustumCulled, plant.renderOrder, plant.layers.mask].join(':')
    const group = groups.get(key) ?? []
    group.push(plant)
    groups.set(key, group)
  }

  return [...groups.values()].map((group, index) => {
    const first = group[0]
    const batch = new THREE.InstancedMesh(first.geometry, first.material, group.length)
    batch.name = `home-scanned-fern-batch-${index + 1}`
    batch.castShadow = first.castShadow
    batch.receiveShadow = first.receiveShadow
    batch.visible = first.visible
    batch.frustumCulled = first.frustumCulled
    batch.renderOrder = first.renderOrder
    batch.layers.mask = first.layers.mask
    batch.userData = { ...first.userData, sourcePlantNames: group.map(plant => plant.name) }
    group.forEach((plant, instance) => {
      if (plant.matrixAutoUpdate) plant.updateMatrix()
      batch.setMatrixAt(instance, plant.matrix)
    })
    batch.instanceMatrix.needsUpdate = true
    batch.computeBoundingBox()
    batch.computeBoundingSphere()
    return batch
  })
}
