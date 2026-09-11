import { useEffect, useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'

// Existing Poly Haven CC0 floor source. Home applies deterministic blended
// sampling and vertex macro-colour so the approved source never reads as a tile.
export const SANCTUARY_SOIL_ALBEDO = '/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-diff-1k.webp'

export function useSanctuarySoilTexture() {
  const source = useTexture(SANCTUARY_SOIL_ALBEDO)
  const texture = useMemo(() => {
    const copy = source.clone()
    copy.colorSpace = THREE.SRGBColorSpace
    copy.wrapS = copy.wrapT = THREE.RepeatWrapping
    // The authored Home geometry already carries multi-repeat UVs. A sub-unit
    // texture transform prevents the soil scan from reading as a repeated tile
    // while retaining enough frequency for close-range ground definition.
    copy.repeat.set(.58, .64)
    copy.center.set(.5, .5)
    copy.rotation = .17
    copy.anisotropy = 8
    copy.needsUpdate = true
    return copy
  }, [source])
  useEffect(() => () => texture.dispose(), [texture])
  return texture
}
