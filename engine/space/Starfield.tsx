"use client"

import { useMemo } from "react"
import { useSpatialStore } from "../store/spatialStore"
import * as THREE from "three"

export default function Starfield() {

  const setStar = useSpatialStore((s)=>s.setStar)
  const selectedStar = useSpatialStore((s)=>s.selectedStar)

  const stars = useMemo(()=>{

    const arr = []
    const cols = 5
    const rows = 4

    const spacingX = 3
    const spacingY = 2.5

    for(let x=0;x<cols;x++){
      for(let y=0;y<rows;y++){

        const id = x*rows+y

        arr.push({
          id,
          position:[
            (x-cols/2)*spacingX,
            (y-rows/2)*spacingY,
            -2
          ]
        })

      }
    }

    return arr

  },[])

  return (

    <group>

      {stars.map((s)=>{

        const selected = selectedStar?.id === s.id
        const dimOthers = selectedStar && !selected

        return (

          <mesh
            key={s.id}
            position={s.position}
            raycast={THREE.Mesh.prototype.raycast}
            onPointerDown={(e)=>{
              e.stopPropagation()
              setStar(s)
            }}
          >

            <sphereGeometry args={[0.25,32,32]} />

            <meshStandardMaterial
              color={selected ? "#ffffff" : "#88aaff"}
              emissive={selected ? "#66ccff" : "#111111"}
              emissiveIntensity={selected ? 2.5 : dimOthers ? 0.05 : 0.25}
              transparent
              opacity={selected ? 1 : 0.5}
            />

          </mesh>

        )

      })}

    </group>

  )

}