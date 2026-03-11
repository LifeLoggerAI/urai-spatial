"use client"

import { useMemo } from "react"

export default function GalaxyBand(){

  const positions = useMemo(()=>{

    const arr = []

    for(let i=0;i<2000;i++){

      const angle = Math.random()*Math.PI*2
      const radius = 60 + Math.random()*80
      const height = (Math.random()-0.5)*10

      arr.push(
        Math.cos(angle)*radius,
        height,
        Math.sin(angle)*radius - 150
      )

    }

    return new Float32Array(arr)

  },[])

  return(

    <points>

      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length/3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>

      <pointsMaterial
        size={1.1}
        color="#b8caff"
        transparent
        opacity={0.25}
        depthWrite={false}
      />

    </points>

  )

}
