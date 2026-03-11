"use client"

import { useMemo, useState } from "react"
import * as THREE from "three"
import { useSpatialStore } from "../state/spatialStore"
import { generateStarPosition } from "../core/starPosition"
import ConstellationLines from "../visual/ConstellationLines"
import ClusterGlow from "../visual/ClusterGlow"

export default function Starfield(){

  const setStar = useSpatialStore(s=>s.setStar)
  const selectedStar = useSpatialStore(s=>s.selectedStar)

  const [hovered,setHovered] = useState<number|null>(null)

  const stars = useMemo(()=>{

    const arr:any[] = []
    const count = 140

    for(let i=0;i<count;i++){

      arr.push({
        id:i,
        position:generateStarPosition(i)
      })

    }

    return arr

  },[])

  const clusterCenters = [
    [-8,3,-6],
    [-4,-4,-7],
    [0,0,-5],
    [4,3,-6],
    [7,-3,-7]
  ]

  return(

    <group>

      <ConstellationLines stars={stars}/>

      {clusterCenters.map((c,i)=>
        <ClusterGlow key={i} position={c as any}/>
      )}

      {stars.map((s)=>{

        const selected = selectedStar?.id === s.id
        const hover = hovered === s.id
        const dimOthers = selectedStar && !selected

        return(

          <mesh
            key={s.id}
            position={s.position}
            raycast={THREE.Mesh.prototype.raycast}

            onPointerOver={()=>setHovered(s.id)}
            onPointerOut={()=>setHovered(null)}

            onPointerDown={(e)=>{
              e.stopPropagation()
              if(selectedStar) return
              setStar(s)
            }}
          >

            <sphereGeometry args={[hover ? 0.35 : 0.25,16,16]} />

            <meshStandardMaterial
              color="#ffffff"
              emissive="#7aa6ff"
              emissiveIntensity={
                selected
                  ? 4
                  : hover
                    ? 2.2
                    : dimOthers
                      ? 0.06
                      : 1.1
              }
            />

          </mesh>

        )

      })}

    </group>

  )

}
