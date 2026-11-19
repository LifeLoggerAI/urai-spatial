import type { Material, Mesh, Object3D } from 'three'

export const HOME_REQUIRED_VISUAL_GEOMETRY = [
  'home-authored-terrain', 'home-orb-sanctuary', 'home-living-vegetation',
  'home-sanctuary-path', 'home-sanctuary-pavilion', 'home-reflecting-water',
  'home-mountain-horizon',
] as const

/** Readiness requires drawable geometry; a named empty/hidden group is insufficient. */
export function hasVisibleHomeGeometry(root: Object3D): boolean {
  for (let parent: Object3D | null = root; parent; parent = parent.parent) {
    if (!parent.visible) return false
  }
  let drawable = false
  root.traverseVisible((object) => {
    const mesh = object as Mesh
    if (!mesh.isMesh || !mesh.geometry?.getAttribute('position')?.count) return
    const materials: Material[] = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    if (materials.some((material) => material.visible && material.colorWrite && material.opacity > 0)) drawable = true
  })
  return drawable
}

export function missingHomeVisualGeometry(scene: Object3D): string[] {
  return HOME_REQUIRED_VISUAL_GEOMETRY.filter((name) => {
    const object = scene.getObjectByName(name)
    return !object || !hasVisibleHomeGeometry(object)
  })
}
