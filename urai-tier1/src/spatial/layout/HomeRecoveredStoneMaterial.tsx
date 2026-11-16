'use client'

import { useEffect, useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { applyHomeCC0MacroVariation, homeCC0MacroProgramKey } from './HomeCC0PhotoMacroVariation.mjs'

const BASE = '/assets/urai/home-production/cc0/rock-tile-floor/'
export const HOME_RECOVERED_STONE_TEXTURES = [
  BASE + 'rock-tile-floor-diff-1k.webp',
  BASE + 'rock-tile-floor-normal-gl-1k.webp',
  BASE + 'rock-tile-floor-arm-1k.webp',
] as const

/** One owned material serves all three existing, world-meter-UV Home paths. */
export function useHomeRecoveredStoneMaterial() {
  const [diffuseSource, normalSource, armSource] = useTexture([...HOME_RECOVERED_STONE_TEXTURES])
  const maxAnisotropy = useThree(state => state.gl.capabilities.getMaxAnisotropy())
  const owned = useMemo(() => {
    const diffuse = diffuseSource.clone()
    const normal = normalSource.clone()
    const arm = armSource.clone()
    const textures = [diffuse, normal, arm]
    for (const texture of textures) {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping
      // The canonical path ribbons already supply X/Z in world meters.
      texture.repeat.set(.5, .5)
      texture.anisotropy = Math.max(1, Math.min(8, maxAnisotropy))
      texture.minFilter = THREE.LinearMipmapLinearFilter
      texture.magFilter = THREE.LinearFilter
      texture.generateMipmaps = true
      texture.colorSpace = texture === diffuse ? THREE.SRGBColorSpace : THREE.NoColorSpace
      texture.needsUpdate = true
    }
    const material = new THREE.MeshStandardMaterial({
      name: 'home-recovered-polyhaven-rock-tile-floor',
      color: '#ffffff', map: diffuse, normalMap: normal,
      normalScale: new THREE.Vector2(.55, .55),
      roughness: 1, roughnessMap: arm,
      aoMap: arm, aoMapIntensity: .35,
      metalness: 0, envMapIntensity: .3,
    })
    // Preserve the photographic pigment, normal and packed roughness maps;
    // the recovered shader adds only restrained world-space color variation.
    material.onBeforeCompile = applyHomeCC0MacroVariation
    material.customProgramCacheKey = homeCC0MacroProgramKey
    material.userData = { source: 'Poly Haven rock_tile_floor', license: 'CC0-1.0',
      receipt: 'operations/assets/third-party/recovered-home-materials-20261115.json',
      finalArtAdmitted: false }
    return { material, textures, users: 0 }
  }, [diffuseSource, normalSource, armSource, maxAnisotropy])

  useEffect(() => {
    owned.users += 1
    return () => {
      owned.users -= 1
      queueMicrotask(() => {
        if (owned.users !== 0) return
        owned.material.dispose()
        owned.textures.forEach(texture => texture.dispose())
      })
    }
  }, [owned])
  return owned.material
}

export function clearHomeRecoveredStoneCache() {
  // useTexture caches the complete loader tuple, not each member separately.
  useTexture.clear([...HOME_RECOVERED_STONE_TEXTURES])
}

export function isHomeRecoveredStoneLoadError(error: Error) {
  return HOME_RECOVERED_STONE_TEXTURES.some(url =>
    error.message.includes(url) || error.message.includes(url.slice(BASE.length)))
}
