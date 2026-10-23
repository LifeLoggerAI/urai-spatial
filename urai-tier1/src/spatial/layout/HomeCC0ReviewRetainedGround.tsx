'use client'
// Local-only test texture application to the retained, real Home GLB ground.
// Operates on the cloned original scene and restores its original material
// references on unmount. No production art admission or source GLB mutation.
import { useEffect } from 'react'
import * as THREE from 'three'
import { applyHomeCC0MacroVariation, homeCC0MacroProgramKey } from './HomeCC0PhotoMacroVariation.mjs'
import { useHomeCC0ReviewMaps } from './HomeCC0ReviewMaterial'

export function HomeCC0ReviewRetainedGround({ scene }: { scene: THREE.Object3D }) {
  const maps = useHomeCC0ReviewMaps('ground')
  useEffect(() => {
    const changed: Array<{ mesh: THREE.Mesh; previous: THREE.Material | THREE.Material[]; current: THREE.MeshStandardMaterial }> = []
    scene.traverse(object => {
      if (!(object instanceof THREE.Mesh) || !object.userData.homeProjectedGround) return
      const previous = object.material
      const current = new THREE.MeshStandardMaterial({
        color: '#ffffff', map: maps.diffuse, normalMap: maps.normal,
        normalScale: new THREE.Vector2(.65, .65),
        roughnessMap: maps.roughness, roughness: 1, metalness: 0,
        envMapIntensity: .28, side: THREE.FrontSide,
        onBeforeCompile: applyHomeCC0MacroVariation,
        customProgramCacheKey: homeCC0MacroProgramKey,
      })
      object.material = current
      changed.push({ mesh: object, previous, current })
    })
    return () => {
      for (const { mesh, previous, current } of changed) {
        mesh.material = previous
        current.dispose()
      }
    }
  }, [scene, maps])
  return null
}
