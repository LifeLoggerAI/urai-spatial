"use client"

import { useMemo, useState } from "react"
import * as THREE from "three"
import { useSpatialStore } from "../state/spatialStore"
import { generateStarPositions } from "../core/starPosition"
import ConstellationLines from "../visual/ConstellationLines"
import ClusterGlow from "../visual/ClusterGlow"

type Star = {
  id:number
  position:[number,number,number]
}

export default function Starfield(){

  const setStar = useSpatialStore(s=>s.setStar)
  const selectedStar = useSpatialStore(s=>s.selectedStar)

  const [hovered,setHovered] = useState<number|null>(null)

  const stars:Star[] = useMemo(()=>{
    return generateStarPositions(42,140)
  },[])

  const geometry = useMemo(()=>{
    return new THREE.SphereGeometry(1,16,16)
  },[])

  const clusterCenters:[number,number,number][] = [
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
        <ClusterGlow key={i} position={c}/>
      )}

      {stars.map(s=>{

        const selected = selectedStar?.id === s.id
        const hover = hovered === s.id
        const dimOthers = selectedStar && !selected

        const size =
          hover ? 0.35 :
          0.25

        return(

          <mesh
            key={s.id}
            position={s.position}

            onPointerOver={()=>setHovered(s.id)}
            onPointerOut={()=>setHovered(null)}

            onPointerDown={(e)=>{
              e.stopPropagation()
              if(selectedStar) return
              setStar(s)
            }}

            scale={[size,size,size]}
            geometry={geometry}
          >

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
              roughness={0.5}
            />

          </mesh>

        )

      })}

    </group>

  )

}