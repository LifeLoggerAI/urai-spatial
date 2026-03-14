"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

const CONES = 120

export default function StarLightCones(){

  const groupRef = useRef<THREE.Group>(null!)

  const { geometry, material, transforms } = useMemo(()=>{

    const geometry = new THREE.ConeGeometry(
      2.4,
      70,
      8,
      1,
      true
    )

    const material = new THREE.MeshBasicMaterial({

      color:"#dbe6ff",
      transparent:true,
      opacity:0.02,

      depthWrite:false,
      depthTest:false,

      blending:THREE.AdditiveBlending,
      side:THREE.DoubleSide

    })

    const transforms = []

    for(let i=0;i<CONES;i++){

      transforms.push({

        position:new THREE.Vector3(
          (Math.random()-0.5)*600,
          (Math.random()-0.5)*200,
          (Math.random()-0.5)*600
        ),

        rotation:new THREE.Euler(
          Math.random()*Math.PI,
          Math.random()*Math.PI,
          0
        ),

        speed:0.001 + Math.random()*0.001

      })

    }

    return { geometry, material, transforms }

  },[])

  const meshes = useMemo(()=>{

    return transforms.map((t,i)=>{

      const m = new THREE.Mesh(geometry,material)

      m.position.copy(t.position)
      m.rotation.copy(t.rotation)

      return m

    })

  },[geometry,material,transforms])

  useFrame((state)=>{

    const t = state.clock.elapsedTime
    const group = groupRef.current
    if(!group) return

    group.children.forEach((mesh:any,i:number)=>{

      const speed = transforms[i].speed

      mesh.rotation.y += speed

      mesh.material.opacity =
        0.018 +
        Math.sin(t*1.4 + i)*0.008

    })

  })

  return (

    <group ref={groupRef}>

      {meshes.map((mesh,i)=>(
        <primitive key={i} object={mesh} />
      ))}

    </group>

  )

}