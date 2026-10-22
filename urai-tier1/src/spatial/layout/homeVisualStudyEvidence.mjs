// Browser scene-graph evidence only: this does not certify visible pixels,
// GPU health, asset rights, or founder acceptance.
export const HOME_GROUND_COVER_INSTANCE_BUDGET = Object.freeze({ low: 350, medium: 850, high: 1600 })

export function inspectHomeVisualStudyScene(scene, { goldenHour, groundCover, qualityTier }) {
  const skyGroup = scene.getObjectByName('home-golden-hour-sky')
  const skyMeshCount = Array.isArray(skyGroup?.children)
    ? skyGroup.children.filter((child) => child.isMesh === true && child.visible !== false && !!child.geometry).length
    : 0
  const skyReady = !goldenHour || skyMeshCount > 0

  const cover = scene.getObjectByName('home-authored-ground-cover-study')
  const coverInstances = cover?.isInstancedMesh === true ? cover.count : 0
  const coverVertices = cover?.geometry?.getAttribute?.('position')?.count ?? 0
  const coverMaterial = cover?.material
  const coverMaterialReady = Array.isArray(coverMaterial)
    ? coverMaterial.some(Boolean)
    : Boolean(coverMaterial)
  const expected = HOME_GROUND_COVER_INSTANCE_BUDGET[qualityTier] ?? 0
  const coverReady = !groundCover || (expected > 0 && coverInstances === expected && coverVertices > 0 && coverMaterialReady)

  return { ready: skyReady && coverReady, skyReady, skyMeshCount, coverReady, coverInstances, coverVertices }
}
