// Source-bound Three/R3F scene audit; requires explicit nonproduction Home review.
export const HOME_CC0_SCENE_AUDIT_VERSION = 'urai-home-photo-runtime-scene-v1'

function loadedTexture(texture) {
  if (!texture?.isTexture || !texture.image) return false
  const image = texture.image
  const width = Number(image.naturalWidth || image.videoWidth || image.width || 0)
  const height = Number(image.naturalHeight || image.videoHeight || image.height || 0)
  return Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0
}
function linkedPhotographicMaterial(material) {
  return Boolean(
    material?.userData?.uraiCC0ReviewSurface &&
    loadedTexture(material.map) &&
    loadedTexture(material.normalMap) &&
    loadedTexture(material.roughnessMap) &&
    typeof material.onBeforeCompile === 'function' &&
    material.customProgramCacheKey?.() === 'urai-home-cc0-photo-macro-v1',
  )
}
export function auditHomeCC0Scene(scene) {
  const stats = { groundMeshes: 0, pathMeshes: 0, shrubMeshes: 0, photoTexturesComplete: false, sceneBound: false, reasons: [] }
  if (!scene || typeof scene.traverse !== 'function' || typeof scene.getObjectByName !== 'function') {
    stats.reasons.push('SCENE_GRAPH_UNAVAILABLE')
    return stats
  }
  let incompletePhotoMeshes = 0
  scene.traverse((object) => {
    if (!object?.isMesh || object.visible === false || !object.geometry) return
    for (const material of (Array.isArray(object.material) ? object.material : [object.material])) {
      const surface = material?.userData?.uraiCC0ReviewSurface
      if (surface !== 'ground' && surface !== 'path') continue
      if (!linkedPhotographicMaterial(material)) { incompletePhotoMeshes += 1; continue }
      if (surface === 'ground') stats.groundMeshes += 1
      else stats.pathMeshes += 1
    }
  })
  const shrubs = scene.getObjectByName('home-cc0-shrub03-review')
  if (shrubs?.traverse) shrubs.traverse((object) => {
    if (object?.isMesh && object.geometry && object.visible !== false &&
      (Array.isArray(object.material) ? object.material : [object.material]).some(material => loadedTexture(material?.map))) {
      stats.shrubMeshes += 1
    }
  })
  if (stats.groundMeshes < 1) stats.reasons.push('GROUNDED_PHOTOGRAPHIC_MATERIAL_NOT_BOUND')
  if (stats.pathMeshes < 3) stats.reasons.push('THREE_PHOTOGRAPHIC_PATH_MATERIALS_NOT_BOUND')
  if (stats.shrubMeshes < 1) stats.reasons.push('TEXTURED_SHRUB_GEOMETRY_NOT_BOUND')
  if (incompletePhotoMeshes) stats.reasons.push('INCOMPLETE_OR_UNVERIFIED_PHOTOGRAPHIC_MAPS')
  stats.photoTexturesComplete = incompletePhotoMeshes === 0 && stats.groundMeshes >= 1 && stats.pathMeshes >= 3
  stats.sceneBound = stats.reasons.length === 0
  return stats
}
