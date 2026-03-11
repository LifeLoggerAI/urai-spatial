"use client"

import { useMemo, useRef, useEffect } from "react"
import * as THREE from "three"
import { useSpatialStore } from "../state/spatialStore"
import { memoryDataset } from "../memory/memoryDataset"
import { generateStarPosition } from "../core/starPosition"

export default function Starfield(){

  const meshRef = useRef<any>(null)

  const setStar = useSpatialStore(s=>s.setStar)
  const selectedStar = useSpatialStore(s=>s.selectedStar)

  const stars = useMemo(()=>{

    return memoryDataset.map(m=>({

      id:m.id,
      position:generateStarPosition(Number(m.id), m.timestamp),
      image:m.image,
      emotion:m.emotion

    }))

  },[])

  useEffect(()=>{

    if(!meshRef.current) return

    const temp = new THREE.Object3D()

    stars.forEach((s,i)=>{

      temp.position.set(
        s.position[0],
        s.position[1],
        s.position[2]
      )

      temp.updateMatrix()
      meshRef.current.setMatrixAt(i,temp.matrix)

    })

    meshRef.current.instanceMatrix.needsUpdate=true

  },[stars])

  return(

    <instancedMesh
      ref={meshRef}
      args={[undefined,undefined,stars.length]}
      onPointerDown={(e)=>{

        const i = e.instanceId
        if(i===undefined) return

        const star = stars[i]

        if(selectedStar) return
        setStar(star)

      }}
    >

      <sphereGeometry args={[0.08,12,12]} />

      <meshBasicMaterial
        color="#9bbcff"
        transparent
        opacity={ selectedStar ? 0.15 : 1 }
        depthWrite={false}
      />

    </instancedMesh>

  )

}
