"use client"

import { useMemo } from "react"
import * as THREE from "three"
import { lifeDataset } from "../lifemap/lifeDataset"
import { useSpatialStore } from "../state/spatialStore"

export default function LifeMap(){

  const setStar = useSpatialStore(s=>s.setStar)
  const selectedStar = useSpatialStore(s=>s.selectedStar)

  const stars = useMemo(()=>lifeDataset,[])

  return(

    <group>

      {stars.map((s)=>{

        const selected = selectedStar?.id === s.id

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

            <sphereGeometry args={[0.12,16,16]} />

            <meshStandardMaterial
              color={ selected ? "#ffffff" : "#aabfff" }
              emissive={ selected ? "#ffffff" : "#111111" }
              emissiveIntensity={ selected ? 2 : 0.3 }
            />

          </mesh>

        )

      })}

    </group>

  )

}
