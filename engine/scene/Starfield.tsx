"use client"

import { useMemo, useRef, useEffect } from "react"
import * as THREE from "three"
import { useFrame } from "@react-three/fiber"
import { useSpatialStore } from "../state/spatialStore"
import { memoryDataset } from "../memory/memoryDataset"
import { generateStarPositions } from "../core/starPosition"

export default function Starfield(){

  const meshRef = useRef(null)

  const setStar = useSpatialStore(s=>s.setStar)
  const selectedStar = useSpatialStore(s=>s.selectedStar)

  const stars = useMemo(()=>{

    const positions = generateStarPositions(42, memoryDataset.length)

    return memoryDataset.map((m,i)=>{

      const p = positions[i].position

      const depth = Math.abs(p[2])

      return{
        id:m.id,
        position:p,
        depth
      }

    })

  },[])


  useEffect(()=>{

    if(!meshRef.current) return

    const temp = new THREE.Object3D()

    stars.forEach((s,i)=>{

      const selected = selectedStar?.id === s.id
      const dimOthers = selectedStar && !selected

      const falloff = Math.max(0.3,1 - s.depth/30)

      const scale = selected
        ? 2
        : dimOthers
          ? 0.5
          : falloff

      temp.position.set(
        s.position[0],
        s.position[1],
        s.position[2]
      )

      temp.scale.set(scale,scale,scale)

      temp.updateMatrix()

      meshRef.current.setMatrixAt(i,temp.matrix)

    })

    meshRef.current.instanceMatrix.needsUpdate = true

  },[stars,selectedStar])


  useFrame(({clock})=>{

    if(!meshRef.current) return

    const pulse = 0.9 + Math.sin(clock.elapsedTime*2)*0.1

    meshRef.current.material.opacity = pulse

  })


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

      <sphereGeometry args={[0.08,16,16]} />

      <meshStandardMaterial
        color="#c8dcff"
        emissive="#9bbcff"
        emissiveIntensity={0.7}
        transparent
        opacity={0.9}
        depthWrite={false}
      />

    </instancedMesh>

  )

}
