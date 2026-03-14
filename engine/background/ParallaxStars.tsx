"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

type Layer = {
  points: THREE.Points
  speed: number
}

export default function ParallaxStars(){

  const groupRef = useRef<THREE.Group>(null!)

  const layers = useMemo(()=>{

    const makeLayer = (
      count:number,
      radius:number,
      size:number,
      speed:number
    ):Layer =>{

      const positions = new Float32Array(count*3)
      const colors = new Float32Array(count*3)

      const color = new THREE.Color()

      for(let i=0;i<count;i++){

        const r = radius + Math.random()*radius*0.5

        const theta = Math.random()*Math.PI*2
        const phi = Math.acos(Math.random()*2-1)

        const x = r*Math.sin(phi)*Math.cos(theta)
        const y = r*Math.sin(phi)*Math.sin(theta)
        const z = r*Math.cos(phi)

        const i3 = i*3

        positions[i3] = x
        positions[i3+1] = y
        positions[i3+2] = z

        const brightness =
          0.45 + Math.random()*0.35

        color.setRGB(
          brightness,
          brightness,
          brightness
        )

        colors[i3] = color.r
        colors[i3+1] = color.g
        colors[i3+2] = color.b

      }

      const geo = new THREE.BufferGeometry()

      geo.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions,3)
      )

      geo.setAttribute(
        "color",
        new THREE.Float32BufferAttribute(colors,3)
      )

      const mat = new THREE.PointsMaterial({

        size,
        vertexColors:true,
        transparent:true,

        /* softer stars */
        opacity:0.35,

        depthWrite:false,

        /* allow depth sorting */
        depthTest:true,

        /* avoid brightness stacking */
        blending:THREE.NormalBlending

      })

      const points = new THREE.Points(geo,mat)
      points.frustumCulled = false

      return { points, speed }

    }

    return [

      makeLayer(4500,1500,0.9,0.0011),

      makeLayer(5200,2200,1.1,0.0006),

      makeLayer(6000,3200,1.3,0.0003)

    ]

  },[])

  useFrame((_,delta)=>{

    if(!groupRef.current) return

    layers.forEach((layer)=>{

      layer.points.rotation.y += delta * layer.speed
      layer.points.rotation.x += delta * layer.speed * 0.2

    })

  })

  return(

    <group ref={groupRef}>

      {layers.map((layer,i)=>(

        <primitive
          key={i}
          object={layer.points}
        />

      ))}

    </group>

  )

}