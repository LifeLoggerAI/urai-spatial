'use client'

import { useEffect, useMemo } from 'react'
import { useGLTF, useTexture } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

export const RECOVERED_FERN_MODEL = '/assets/urai/home-production/cc0/polyhaven-v48/fern_02/asset.gltf'
export const RECOVERED_FERN_ALPHA = '/assets/urai/home-production/cc0/polyhaven-v48/fern_02/textures/fern_02_alpha_1k.png'
const RECOVERED_FERN_DIRECTORY = '/assets/urai/home-production/cc0/polyhaven-v48/fern_02/'
export const RECOVERED_FERN_DEPENDENCIES = [
  RECOVERED_FERN_MODEL,
  `${RECOVERED_FERN_DIRECTORY}fern_02.bin`,
  `${RECOVERED_FERN_DIRECTORY}textures/fern_02_diff_1k.jpg`,
  `${RECOVERED_FERN_DIRECTORY}textures/fern_02_nor_gl_1k.jpg`,
  `${RECOVERED_FERN_DIRECTORY}textures/fern_02_arm_1k.jpg`,
  RECOVERED_FERN_ALPHA,
] as const

export function clearRecoveredFernAssetCache() {
  useGLTF.clear(RECOVERED_FERN_MODEL)
  // The silhouette is a separate TextureLoader cache entry, not part of glTF.
  useTexture.clear(RECOVERED_FERN_ALPHA)
}

export function isRecoveredFernAssetLoadError(error: Error) {
  return RECOVERED_FERN_DEPENDENCIES.some((asset) => error.message.includes(asset))
    || /fern_02(?:_diff_1k\.jpg|_nor_gl_1k\.jpg|_arm_1k\.jpg|_alpha_1k\.png|\.bin)/.test(error.message)
    || error.message === 'RECOVERED_FERN_PHOTOGRAPHIC_MAPS_MISSING'
    || error.message === 'RECOVERED_FERN_SOURCE_SHAPE_CHANGED'
}

export type RecoveredFernVariant = {
  name: string
  /** Shared loader geometry. Consumers must keep dispose={null}. */
  geometry: THREE.BufferGeometry
  /** Source rotation/scale only; the four-plant display grid is removed. */
  localMatrix: THREE.Matrix4
  material: THREE.MeshStandardMaterial
}

export type RecoveredFernAsset = {
  variants: readonly RecoveredFernVariant[]
  rootRotation: THREE.Euler
  sourceUrl: typeof RECOVERED_FERN_MODEL
}

/**
 * Recover the original photographic fern over the exact geometry already used
 * by Home and Replay. Every source dependency is a vendored local file. The
 * source glTF's diffuse JPEG has no alpha, so its separate silhouette map must
 * be bound explicitly. Nothing in the shared loader cache is changed/disposed.
 * Assign each existing placement to one variant, rather than placing the
 * source's four-plant display grid at every root.
 */
export function useRecoveredFernAsset(): RecoveredFernAsset {
  const source = useGLTF(RECOVERED_FERN_MODEL, false, false)
  const alphaSource = useTexture(RECOVERED_FERN_ALPHA)
  const maxAnisotropy = useThree((state) => state.gl.capabilities.getMaxAnisotropy())

  const owned = useMemo(() => {
    const scene = source.scene.clone(true)
    scene.updateMatrixWorld(true)
    const inverseRoot = scene.matrixWorld.clone().invert()
    const meshes: THREE.Mesh[] = []
    scene.traverse((object) => { if (object instanceof THREE.Mesh) meshes.push(object) })
    if (meshes.length !== 4 || meshes.some((mesh) =>
      Array.isArray(mesh.material) || !(mesh.material instanceof THREE.MeshStandardMaterial))) {
      throw new Error('RECOVERED_FERN_SOURCE_SHAPE_CHANGED')
    }
    const sourceMaterial = meshes[0].material as THREE.MeshStandardMaterial
    if (!sourceMaterial.map || !sourceMaterial.normalMap || !sourceMaterial.roughnessMap) {
      throw new Error('RECOVERED_FERN_PHOTOGRAPHIC_MAPS_MISSING')
    }

    const diffuse = sourceMaterial.map.clone()
    const normal = sourceMaterial.normalMap.clone()
    const arm = sourceMaterial.roughnessMap.clone()
    const alpha = alphaSource.clone()
    // Match the glTF sampler/UV frame; TextureLoader otherwise flips this PNG.
    alpha.wrapS = diffuse.wrapS
    alpha.wrapT = diffuse.wrapT
    alpha.offset.copy(diffuse.offset)
    alpha.repeat.copy(diffuse.repeat)
    alpha.center.copy(diffuse.center)
    alpha.rotation = diffuse.rotation
    alpha.channel = diffuse.channel
    const textures = [diffuse, normal, arm, alpha]
    for (const texture of textures) {
      texture.flipY = false
      texture.colorSpace = texture === diffuse ? THREE.SRGBColorSpace : THREE.NoColorSpace
      texture.anisotropy = Math.max(1, Math.min(8, maxAnisotropy))
      texture.minFilter = THREE.LinearMipmapLinearFilter
      texture.magFilter = THREE.LinearFilter
      texture.generateMipmaps = true
      texture.needsUpdate = true
    }

    const variants = meshes.map((mesh): RecoveredFernVariant => {
      const material = (mesh.material as THREE.MeshStandardMaterial).clone()
      material.name = `${sourceMaterial.name}-recovered-${mesh.name}`
      material.map = diffuse
      material.normalMap = normal
      material.normalScale.set(.65, .65)
      material.roughnessMap = arm
      material.metalnessMap = arm
      material.aoMap = arm
      material.aoMapIntensity = .65
      material.alphaMap = alpha
      material.alphaTest = .5
      material.alphaToCoverage = true
      material.transparent = false
      material.opacity = 1
      material.depthWrite = true
      material.side = THREE.DoubleSide
      material.roughness = 1
      material.metalness = 0
      material.needsUpdate = true
      const localMatrix = new THREE.Matrix4().multiplyMatrices(inverseRoot, mesh.matrixWorld)
      localMatrix.setPosition(0, 0, 0)
      return { name: mesh.name, geometry: mesh.geometry, localMatrix, material }
    })

    const asset: RecoveredFernAsset = {
      variants, rootRotation: scene.rotation.clone(), sourceUrl: RECOVERED_FERN_MODEL,
    }
    return {
      asset,
      textures,
      users: 0,
    }
  }, [source.scene, alphaSource, maxAnisotropy])

  useEffect(() => {
    owned.users += 1
    return () => {
      owned.users -= 1
      // React's development effect replay immediately reacquires the same
      // resources. Dispose only after an actual unmount or resource replacement.
      queueMicrotask(() => {
        if (owned.users !== 0) return
        for (const variant of owned.asset.variants) variant.material.dispose()
        for (const texture of owned.textures) texture.dispose()
      })
    }
  }, [owned])

  return owned.asset
}
