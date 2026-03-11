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

        // slight natural offset so stars don't form a perfect grid
        const jitterX = (Math.random()-0.5)*0.25
        const jitterY = (Math.random()-0.5)*0.25

        arr.push({
          id,
          position:[
            (x-cols/2)*spacingX + jitterX,
            (y-rows/2)*spacingY + jitterY,
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

            <sphereGeometry args={[0.35,32,32]} />

            <meshStandardMaterial
              color="#ffffff"
              emissive="#7aa6ff"
              emissiveIntensity={
                selected
                  ? 4
                  : dimOthers
                    ? 0.2
                    : 1.6
              }
              roughness={0.25}
              metalness={0.05}
            />

          </mesh>

        )

      })}

    </group>

  )

}