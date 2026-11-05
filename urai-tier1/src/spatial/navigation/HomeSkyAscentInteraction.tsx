'use client'

import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useSceneStore } from '../store/useSceneStore'
import { createHomeSkyTapGate, isUpwardHomeSkyRay, subscribeHomeSkyTaps } from './homeSkyInteraction'

function paintedVisibleHit(hit: THREE.Intersection) {
  let node: THREE.Object3D | null = hit.object
  while (node) { if (!node.visible) return false; node = node.parent }
  const object = hit.object as THREE.Mesh
  if (!object.isMesh) return false
  const materials = Array.isArray(object.material)
    ? hit.face ? [object.material[hit.face.materialIndex]] : object.material
    : [object.material]
  return materials.some(material => Boolean(material) && material.visible !== false && material.colorWrite !== false && !(material.transparent && material.opacity <= .01))
}

export function visibleHomeSkyAt({ camera, scene, rect, x, y, raycaster = new THREE.Raycaster() }: {
  camera: THREE.Camera
  scene: THREE.Scene
  rect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>
  x: number
  y: number
  raycaster?: THREE.Raycaster
}) {
  if (![x,y,rect.left,rect.top,rect.width,rect.height].every(Number.isFinite) || rect.width <= 0 || rect.height <= 0) return false
  if (x < rect.left || x > rect.left + rect.width || y < rect.top || y > rect.top + rect.height) return false
  const pointer = new THREE.Vector2((x - rect.left) / rect.width * 2 - 1, 1 - (y - rect.top) / rect.height * 2)
  camera.updateMatrixWorld(true)
  scene.updateMatrixWorld(true)
  raycaster.setFromCamera(pointer, camera)
  raycaster.layers.mask = camera.layers.mask
  if (!isUpwardHomeSkyRay(raycaster.ray.direction)) return false
  // Hit the actual existing painted sky, never a new invisible interaction
  // plane. Conservative foreground occlusion also preserves Orb/canopy intent.
  const hit = raycaster.intersectObjects(scene.children, true).find(paintedVisibleHit)
  return hit?.object.name === 'home-original-living-sky'
}

export default function HomeSkyInteraction({ groundDescent, onAscent }: { groundDescent: boolean; onAscent: () => void }) {
  const { camera, scene, gl } = useThree()
  useEffect(() => {
    const canvas = gl.domElement
    const owner = canvas.closest<HTMLElement>('[data-home-primary-owner="asset-driven"]')
    if (!owner) return
    const raycaster = new THREE.Raycaster()
    const gate = createHomeSkyTapGate({
      isReady: () => {
        const state = useSceneStore.getState()
        return state.phase === 'HOME' && !state.inputLocked && !groundDescent && owner.dataset.homeAssetsReady === 'true'
      },
      isVisibleSkyAt: (x,y) => visibleHomeSkyAt({ camera, scene, rect:canvas.getBoundingClientRect(), x, y, raycaster }),
      onAscent,
    })
    return subscribeHomeSkyTaps({ owner, canvas, gate, lifecycleTarget:window })
  }, [camera, scene, gl, groundDescent, onAscent])
  return null
}
