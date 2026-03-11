"use client"

import { useMemo } from "react"
import * as THREE from "three"
import { useSpatialStore } from "../state/spatialStore"
import { STAR_RADIUS } from "../camera/cameraConfig"

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

  return(

    <group>

      {stars.map((s)=>{

        const selected = selectedStar?.id === s.id
        const dimOthers = selectedStar && !selected

        if(selected) return null

        return(

          <mesh
            key={s.id}
            position={s.position}
            raycast={THREE.Mesh.prototype.raycast}

            onPointerDown={(e)=>{
              e.stopPropagation()
              if(selectedStar) return
              setStar(s)
            }}
          >

            <sphereGeometry args={[STAR_RADIUS,32,32]} />

            <meshStandardMaterial
              color="#bbbbbb"
              emissive="#ffffff"
              emissiveIntensity={dimOthers ? 0.01 : 0.4}
              roughness={0.2}
            />

          </mesh>

        )

      })}

    </group>

  )

}