"use client"

import { useMemo } from "react"
import * as THREE from "three"
import { useSpatialStore } from "../state/spatialStore"

export default function Starfield(){

  const setStar = useSpatialStore(s=>s.setStar)
  const selectedStar = useSpatialStore(s=>s.selectedStar)

  const stars = useMemo(()=>{

    const arr:any[] = []

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

        const scale = selected ? 0.18 : (selectedStar ? 0.05 : 0.12)
        const opacity = selectedStar ? 0.25 : 1

        return(

          <mesh
            key={s.id}
            position={s.position}
            scale={scale}
            raycast={THREE.Mesh.prototype.raycast}
            onPointerDown={(e)=>{
              e.stopPropagation()
              if(selectedStar) return
              setStar(s)
            }}
          >

            <sphereGeometry args={[1,16,16]} />

            <meshBasicMaterial
              color={ selected ? "#ffffff" : (dimOthers ? "#4d5a7a" : "#9bbcff") }
              transparent
              opacity={opacity}
              depthWrite={false}
              toneMapped={false}
            />

          </mesh>

        )

      })}

    </group>

  )

}