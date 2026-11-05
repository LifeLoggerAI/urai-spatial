'use client'
// Poly Haven shrub_03 is an actual photographic-textured glTF asset, not an
// authored cylinder or photo-card. Strictly review-only, never a final claim.
import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { homeTerrainHeight } from './HomeSanctuaryGeometry'

const model = '/assets/urai/home-production/cc0-review/shrub/shrub_03_1k.gltf'
const locations = [
  [-10.4, -8.2, .72, .2],
  [-11.7, -4.5, .86, 1.6],
  [10.8, -8.5, .80, 2.3],
  [11.3, -3.1, .72, -.7],
] as const

export function HomeCC0ReviewShrubs() {
  const gltf = useGLTF(model)
  const objects = useMemo(() => locations.map((row) => {
    const [x,z,scale,yaw] = row
    const object = gltf.scene.clone(true)
    object.position.set(x, homeTerrainHeight(x,z), z)
    object.rotation.y = yaw
    object.scale.setScalar(scale)
    object.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
    return object
  }), [gltf.scene])
  return <group name="home-cc0-shrub03-review" userData={{source:'Poly Haven shrub_03 CC0',classification:'NONPRODUCTION_CANDIDATE_UNAPPROVED'}}>
    {objects.map((object,index)=><primitive key={index} object={object} dispose={null} />)}
  </group>
}
