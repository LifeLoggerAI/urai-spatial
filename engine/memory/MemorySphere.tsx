"use client"

import { useMemo, useRef, useEffect } from "react"
import { useFrame } from "@react-three/fiber"
import { useTexture } from "@react-three/drei"
import * as THREE from "three"
import { useSpatialStore } from "../state/spatialStore"
import { STAR_DATA } from "../data/starData"

export default function MemorySphere(){

  const sphereRef = useRef<THREE.Mesh>(null)

  const selectedStarId = useSpatialStore(s=>s.selectedStarId)
  const inReplayMode = useSpatialStore(s=>s.inReplayMode)

  const selectedStar = useMemo(()=>{

    if(selectedStarId===null) return null
    return STAR_DATA.find(s=>s.id===selectedStarId) || null

  },[selectedStarId])

  const texture = useTexture(selectedStar?.image || "/memory/sample.jpg")

  useEffect(()=>{
    if(sphereRef.current){
      sphereRef.current.scale.set(0.01,0.01,0.01)
    }
  },[])

  useFrame((state)=>{
    if(!sphereRef.current) return

    const visible = !!selectedStar && !inReplayMode
    const targetScale = visible ? 1 : 0

    sphereRef.current.scale.lerp(
      new THREE.Vector3(targetScale,targetScale,targetScale),
      0.12
    )

    if(visible){

      const pulse = Math.sin(state.clock.elapsedTime*0.6)*0.04+1
      sphereRef.current.scale.multiplyScalar(pulse)

    }

  })

  if(!selectedStar) return null

  return(

    <mesh
      ref={sphereRef}
      position={selectedStar.position}
    >

      <sphereGeometry args={[1.25,32,32]} />

      <meshStandardMaterial
        side={THREE.BackSide}
        map={texture}
        emissive="#ffffff"
        emissiveIntensity={0.6}
        toneMapped={false}
      />

    </mesh>

  )

}
