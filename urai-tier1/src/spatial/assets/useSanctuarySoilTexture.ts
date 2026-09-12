import { useEffect, useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'

// Governed Poly Haven CC0 source. Home deliberately samples it above paving
// scale so the source contributes mineral grain rather than readable blocks.
export const SANCTUARY_SOIL_ALBEDO = '/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-diff-1k.webp'

export function useSanctuarySoilTexture() {
  const source = useTexture(SANCTUARY_SOIL_ALBEDO)
  const texture = useMemo(() => {
    const copy = source.clone()
    copy.colorSpace = THREE.SRGBColorSpace
    copy.wrapS = copy.wrapT = THREE.RepeatWrapping
    // The terrain shader already cross-blends deterministic offsets. Raising the
    // source frequency prevents individual scan blocks from becoming landscape
    // scale pavers while retaining authored close-range mineral definition.
    copy.repeat.set(1.42, 1.56)
    copy.center.set(.5, .5)
    copy.rotation = .31
    copy.anisotropy = 8
    copy.needsUpdate = true
    return copy
  }, [source])
  useEffect(() => () => texture.dispose(), [texture])
  return texture
}
