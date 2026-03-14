"use client"

import { useSpatialStore } from "../state/spatialStore"
import { useFrame, useThree } from "@react-three/fiber"
import { useRef } from "react"
import * as THREE from "three"

export default function StarHalo(){

  const selectedStar = useSpatialStore(s => s.selectedStar)

  const mesh = useRef<THREE.Mesh>(null!)
  const { camera } = useThree()

  useFrame(({ clock }) => {

    if(!mesh.current) return

    /* smooth pulse */

    const pulse =
      1 + Math.sin(clock.elapsedTime * 2) * 0.08

    mesh.current.scale.setScalar(pulse)

    /* billboard toward camera */

    mesh.current.quaternion.copy(
      camera.quaternion
    )

  })

  if(!selectedStar) return null

  return (

    <mesh
      ref={mesh}
      position={selectedStar.position}
      frustumCulled={false}
    >

      <planeGeometry args={[3.2,3.2]} />

      <meshBasicMaterial
        color="#9bbcff"
        transparent
        opacity={0.42}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        depthTest={false}
        side={THREE.DoubleSide}
      />

    </mesh>

  )

}