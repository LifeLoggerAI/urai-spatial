import { useEffect, useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'

// Governed Poly Haven CC0 rock scan; hashes and source URLs are retained in
// operations/assets/home-v48-production-asset-provenance.json. This is a UV
// atlas, not a tileable image: the visible terrain shader samples only inspected
// interior rock islands, never the stretched atlas gutters.
export const SANCTUARY_SOIL_ALBEDO = '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_01/textures/rock_face_01_diff_1k.jpg'

export function useSanctuarySoilTexture() {
  const source = useTexture(SANCTUARY_SOIL_ALBEDO)
  const texture = useMemo(() => {
    const copy = source.clone()
    copy.colorSpace = THREE.SRGBColorSpace
    copy.wrapS = copy.wrapT = THREE.RepeatWrapping
    // Sampling frequency belongs to the authored terrain UVs. Keep this matrix
    // neutral so the terrain's explicit atlas-island bounds remain auditable.
    copy.repeat.set(1, 1)
    copy.anisotropy = 8
    copy.needsUpdate = true
    return copy
  }, [source])
  useEffect(() => () => texture.dispose(), [texture])
  return texture
}
