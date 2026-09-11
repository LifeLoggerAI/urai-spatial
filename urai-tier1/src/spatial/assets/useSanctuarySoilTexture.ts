import { useEffect, useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'

export const SANCTUARY_SOIL_ALBEDO = '/assets/urai/generated/materials/sanctuary-slate-soil-albedo-v1.webp'

export function useSanctuarySoilTexture() {
  const source = useTexture(SANCTUARY_SOIL_ALBEDO)
  const texture = useMemo(() => {
    const copy = source.clone()
    copy.colorSpace = THREE.SRGBColorSpace
    copy.wrapS = copy.wrapT = THREE.RepeatWrapping
    // The authored Home geometry already carries multi-repeat UVs. A sub-unit
    // texture transform prevents the soil scan from reading as a repeated tile
    // while retaining enough frequency for close-range ground definition.
    copy.repeat.set(.68, .72)
    copy.center.set(.5, .5)
    copy.rotation = .08
    copy.anisotropy = 8
    copy.needsUpdate = true
    return copy
  }, [source])
  useEffect(() => () => texture.dispose(), [texture])
  return texture
}
