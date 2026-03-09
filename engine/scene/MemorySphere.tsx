"use client"

import { useSpatialStore } from "../store/spatialStore"

export default function MemorySphere(){

  const star = useSpatialStore(s=>s.selectedStar)

  if(!star) return null

  return(

    <mesh position={star}>

      <sphereGeometry args={[1.7,32,32]} />

      <meshStandardMaterial
        color="#7fa9c6"
        transparent
        opacity={0.35}
      />

    </mesh>

  )

}
