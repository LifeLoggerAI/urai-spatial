'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import {
  verifyCapturedRealityHybridPayload,
  type CapturedRealityHybridMeshPayload,
} from './capturedRealityHybridGeometry'

function disposeOwnedMeshScene(scene: THREE.Group) {
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  const textures = new Set<THREE.Texture>()
  scene.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return
    if (object.geometry instanceof THREE.BufferGeometry) geometries.add(object.geometry)
    const incoming = Array.isArray(object.material) ? object.material : [object.material]
    incoming.forEach(material => {
      if (!(material instanceof THREE.Material)) return
      materials.add(material)
      Object.values(material).forEach(value => { if (value instanceof THREE.Texture) textures.add(value) })
    })
  })
  for (const geometry of geometries) geometry.dispose()
  for (const material of materials) material.dispose()
  for (const texture of textures) texture.dispose()
}

/** Hybrid GLB renders in the same R3F Canvas and depth buffer as Gaussian splats.
 * A private mesh must already have passed independent authorization and immutable
 * artifact verification; this component never makes a network request itself.
 */
export function CapturedRealityHybridMesh({
  mesh, activeSplatSha256, mode, onRenderReady,
}: {
  mesh: CapturedRealityHybridMeshPayload | null
  activeSplatSha256: string
  mode: 'proof' | 'runtime'
  onRenderReady?: (sha256: string) => void
}) {
  const [ownedScene, setOwnedScene] = useState<{ key: string; scene: THREE.Group } | null>(null)
  const sceneKey = mesh ? `${mesh.sha256}:${activeSplatSha256}:${mode}` : ''
  const [failed, setFailed] = useState(false)
  const onRenderReadyRef = useRef(onRenderReady)
  onRenderReadyRef.current = onRenderReady
  const worldMatrix = useMemo(
    () => mesh ? new THREE.Matrix4().fromArray([...mesh.registration.meshToWorld]) : new THREE.Matrix4(),
    [mesh],
  )

  useEffect(() => {
    let active = true
    let loaded: THREE.Group | null = null
    setOwnedScene(null)
    setFailed(false)
    if (!mesh) return
    void (async () => {
      const verified = await verifyCapturedRealityHybridPayload(mesh, activeSplatSha256, mode)
      // Preserve byteOffset/length: passing a pooled ArrayBuffer can append unrelated private bytes.
      const exactBytes = verified.slice().buffer
      const gltf = await new GLTFLoader().parseAsync(exactBytes, '')
      loaded = gltf.scene
      if (!active) { disposeOwnedMeshScene(loaded); return }
      let invalidMaterial = false
      let drawRecorded = false
      loaded.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return
        const mats = Array.isArray(object.material) ? object.material : [object.material]
        if (mats.some(material => !(material instanceof THREE.Material) || material.transparent || !material.depthTest || !material.depthWrite)) {
          invalidMaterial = true
        }
        // This fires only when the actual GLB mesh reaches the renderer, not
        // when its manifest or GLTFLoader.parseAsync promise succeeds.
        object.onAfterRender = () => {
          if (!active || drawRecorded) return
          drawRecorded = true
          queueMicrotask(() => { if (active) onRenderReadyRef.current?.(mesh.sha256) })
        }
      })
      if (invalidMaterial) {
        disposeOwnedMeshScene(loaded)
        loaded = null
        throw new Error('HYBRID_DEPTH_MATERIAL_NOT_ACCEPTED')
      }
      setOwnedScene({ key: sceneKey, scene: loaded })
    })().catch(() => { if (active) setFailed(true) })
    return () => {
      active = false
      if (loaded) disposeOwnedMeshScene(loaded)
    }
  }, [mesh, activeSplatSha256, mode, sceneKey])

  // Private paths, hashes and identities are never surfaced through errors.
  if (failed) throw new Error('PRIVATE_HYBRID_MESH_UNAVAILABLE')
  return (
    <group
      matrix={worldMatrix}
      matrixAutoUpdate={false}
      userData={{ uraiCapturedRealityHybrid: true, mode, admittedForNavigation: mode === 'runtime' && mesh?.registration.metricScaleReviewed === true }}
    >
      {ownedScene?.key === sceneKey ? <primitive object={ownedScene.scene} dispose={null} /> : null}
    </group>
  )
}

export default CapturedRealityHybridMesh
