"use client"

import { useMemo } from "react"
import * as THREE from "three"
import { useSpatialStore } from "../state/spatialStore"

export default function Starfield(){

  const setStar = useSpatialStore(s=>s.setStar)
  const selectedStar = useSpatialStore(s=>s.selectedStar)

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
            -5
          ] as [number,number,number]
        })
      }
    }

    return arr

  },[])

  // hide all stars when memory sphere is active
  if(selectedStar) return null

  return(

    <group>

      {stars.map((s)=>{

        return(

          <mesh
            key={s.id}
            position={s.position}
            raycast={THREE.Mesh.prototype.raycast}

            onPointerDown={(e)=>{
              e.stopPropagation()
              setStar(s)
            }}
          >

            <sphereGeometry args={[0.35,32,32]} />

            <meshStandardMaterial
              color="#aaaaaa"
              emissive="#111111"
              emissiveIntensity={0.25}
            />

          </mesh>

        )

      })}

    </group>

  )

}