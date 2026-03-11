"use client"

import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

function createLayer(count, depth){

  const positions = new Float32Array(count*3)

  for(let i=0;i<count;i++){

    positions[i*3]   = (Math.random()-0.5)*200
    positions[i*3+1] = (Math.random()-0.5)*200
    positions[i*3+2] = -depth - Math.random()*120

  }

  return positions

}

export default function ParallaxStars(){

  const layer1 = useRef()
  const layer2 = useRef()
  const layer3 = useRef()

  const stars1 = createLayer(800,20)
  const stars2 = createLayer(700,60)
  const stars3 = createLayer(600,120)

  useFrame(({clock})=>{

    const t = clock.elapsedTime

    if(layer1.current){
      layer1.current.material.opacity = 0.6 + Math.sin(t*2)*0.2
    }

    if(layer2.current){
      layer2.current.material.opacity = 0.5 + Math.sin(t*1.6)*0.25
    }

    if(layer3.current){
      layer3.current.material.opacity = 0.4 + Math.sin(t*1.2)*0.25
    }

  })

  return(

    <group>

      <points ref={layer1}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={stars1.length/3}
            array={stars1}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial size={0.7} color="#7fa8ff" transparent opacity={0.6}/>
      </points>

      <points ref={layer2}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={stars2.length/3}
            array={stars2}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial size={0.9} color="#9bbcff" transparent opacity={0.5}/>
      </points>

      <points ref={layer3}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={stars3.length/3}
            array={stars3}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial size={1.1} color="#c8dcff" transparent opacity={0.4}/>
      </points>

    </group>

  )

}
