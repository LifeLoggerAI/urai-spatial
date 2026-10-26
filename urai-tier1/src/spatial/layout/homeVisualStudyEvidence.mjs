// Browser scene-graph evidence only: this does not certify visible pixels,
// GPU health, asset rights, or founder acceptance.
export const HOME_GROUND_COVER_INSTANCE_BUDGET = Object.freeze({ low: 350, medium: 850, high: 1600 })

// A present object is not scene-visible when its own group or ANY ancestor
// is hidden. Guard the evidence layer from false-green offscreen studies.
function visibleInSceneHierarchy(object) {
  if (!object) return false
  const visited = new Set()
  let current = object
  while (current) {
    if (current.visible === false || visited.has(current)) return false
    visited.add(current)
    current = current.parent
  }
  return true
}

// Three.js can retain meshes that are intentionally unrenderable. Their
// existence must never certify a visible Home study. This remains scene-graph
// evidence, not a substitute for an actual browser frame or human review.
function renderableMaterial(value) {
  const items = Array.isArray(value) ? value : [value]
  return items.some(material => material && typeof material === 'object'
    && material.visible !== false && material.colorWrite !== false
    && material.opacity !== 0)
}

export function inspectHomeVisualStudyScene(scene, { goldenHour, groundCover, qualityTier }) {
  const skyGroup = scene.getObjectByName('home-golden-hour-sky')
  const skyMeshCount = Array.isArray(skyGroup?.children)
    ? skyGroup.children.filter((child) => child.isMesh === true && !!child.geometry
      && renderableMaterial(child.material) && visibleInSceneHierarchy(child)).length
    : 0
  const skyReady = !goldenHour || (visibleInSceneHierarchy(skyGroup) && skyMeshCount > 0)

  const cover = scene.getObjectByName('home-authored-ground-cover-study')
  const coverInstances = cover?.isInstancedMesh === true ? cover.count : 0
  const coverVertices = cover?.geometry?.getAttribute?.('position')?.count ?? 0
  const coverMaterial = cover?.material
  const coverMaterialReady = renderableMaterial(coverMaterial)
  const expected = HOME_GROUND_COVER_INSTANCE_BUDGET[qualityTier] ?? 0
  const coverReady = !groundCover || (visibleInSceneHierarchy(cover) && expected > 0 && coverInstances === expected && coverVertices > 0 && coverMaterialReady)

  return { ready: skyReady && coverReady, skyReady, skyMeshCount, coverReady, coverInstances, coverVertices }
}
