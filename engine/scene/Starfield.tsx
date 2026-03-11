"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { useSpatialStore } from "../state/spatialStore"
import { STAR_DATA } from "../data/starData"
import { Star } from "./Star"
import { Vector3 } from "three"

const attractor = new Vector3(0,0,-5)

export default function Starfield() {

  const selectedStarId = useSpatialStore((s) => s.selectedStarId)
  const setSelectedStarId = useSpatialStore((s) => s.setSelectedStarId)
  const interactionLock = useSpatialStore((s) => s.interactionLock)

  const stars = useMemo(() => STAR_DATA, [])
  const starRefs = useRef<any>([])

  const handleStarClick = (starId: number) => {
    if (interactionLock) return
    if (selectedStarId !== null) return
    setSelectedStarId(starId)
  }

  const matRef = useRef<any>(null)

  useFrame(({clock})=>{
    if(selectedStarId && matRef.current){
      const pulse = 1.4 + Math.sin(clock.elapsedTime * 2) * 0.25
      matRef.current.emissiveIntensity = pulse
    }

    stars.forEach((s,i)=>{
      const mesh = starRefs.current[i]
      if(!mesh) return
  
      const pos = mesh.position
  
      const dir = new Vector3()
        .subVectors(attractor,pos)
        .normalize()
  
      pos.addScaledVector(dir,0.0006)
    })
  })

  return (
    <group>
      {stars.map((star, i) => (
        <Star
          key={star.id}
          ref={el => starRefs.current[i] = el}
          starData={star}
          isSelected={selectedStarId === star.id}
          isDimmed={selectedStarId !== null && selectedStarId !== star.id}
          onClick={handleStarClick}
          matRef={matRef}
        />
      ))}
    </group>
  )
}