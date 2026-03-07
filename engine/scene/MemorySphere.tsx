"use client"

import { useFrame, useThree } from "@react-three/fiber"
import { useRef, useState } from "react"
import * as THREE from "three"
import { useSpatial } from "@/stores/spatialStore"

export default function MemorySphere(){

  const {camera} = useThree()

  const selected = useSpatial(s=>s.selected)
  const position = useSpatial(s=>s.position)

  const ref = useRef<any>()

  const [visible,setVisible] = useState(false)

  const target = new THREE.Vector3()

  useFrame(({clock})=>{

    if(selected===null) return

    target.set(position[0],position[1],position[2] + 12)

    const d = camera.position.distanceTo(target)

    if(d < 0.4){
      setVisible(true)
    }

    if(!ref.current) return

    const s = 1 + Math.sin(clock.elapsedTime*2) * 0.05

    ref.current.scale.set(s,s,s)

  })

  if(!visible) return null

  return(
    <mesh position={position} ref={ref}>
      <sphereGeometry args={[2,32,32]}/>
      <meshBasicMaterial
        color="#7fa9c6"
        transparent
        opacity={0.35}
      />
    </mesh>
  )
}
