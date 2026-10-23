'use client'
// Strict local-only development candidate; original Poly Haven 1K photographic
// maps are verified by scripts/home-cc0-source-review.mjs before staging.
import { useEffect, useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { applyHomeCC0MacroVariation, homeCC0MacroProgramKey } from './HomeCC0PhotoMacroVariation.mjs'

type Surface = 'ground' | 'path'
export function useHomeCC0ReviewMaps(surface: Surface) {
  const folder = surface === 'ground' ? 'ground' : 'path'
  const base = '/assets/urai/home-production/cc0-review/' + folder + '/'
  const [diffuseSource, normalSource, roughnessSource] = useTexture([
    base + 'color.jpg', base + 'normal.jpg', base + 'roughness.jpg',
  ])
  const maps = useMemo(() => {
    const diffuse = diffuseSource.clone()
    const normal = normalSource.clone()
    const roughness = roughnessSource.clone()
    for (const texture of [diffuse, normal, roughness]) {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping
      // Previous UV repair supplies world-XZ meters: 1 tile per 2 meters.
      texture.repeat.set(.5, .5)
      texture.anisotropy = 4
      texture.needsUpdate = true
    }
    diffuse.colorSpace = THREE.SRGBColorSpace
    normal.colorSpace = roughness.colorSpace = THREE.NoColorSpace
    return { diffuse, normal, roughness }
  }, [diffuseSource, normalSource, roughnessSource])
  useEffect(() => () => { maps.diffuse.dispose(); maps.normal.dispose(); maps.roughness.dispose() }, [maps])
  return maps
}
export function HomeCC0ReviewMaterial({ surface }: { surface: Surface }) {
  const maps = useHomeCC0ReviewMaps(surface)
  return <meshStandardMaterial color="#ffffff" map={maps.diffuse}
    normalMap={maps.normal} normalScale={new THREE.Vector2(.65, .65)}
    roughnessMap={maps.roughness} roughness={1} metalness={0}
    envMapIntensity={.28} onBeforeCompile={applyHomeCC0MacroVariation} customProgramCacheKey={homeCC0MacroProgramKey} />
}
