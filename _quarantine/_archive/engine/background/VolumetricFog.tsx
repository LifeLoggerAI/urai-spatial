"use client"

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

export default function VolumetricFog(){

  const mesh = useRef<THREE.Mesh>(null!)

  const geometry = useMemo(()=>{
    return new THREE.SphereGeometry(1,64,64)
  },[])

  const material = useMemo(()=>{

    return new THREE.MeshBasicMaterial({

      color:"#141a2a",
      transparent:true,
      opacity:0.018,
      side:THREE.BackSide,
      depthWrite:false

    })

  },[])

  useFrame(()=>{

    const m = mesh.current
    if(!m) return

    m.rotation.y += 0.00018
    m.rotation.x += 0.00006

  })

  return(

    <mesh
      ref={mesh}
      geometry={geometry}
      material={material}
      scale={[520,520,520]}
      frustumCulled={false}
    />

  )

}"use client"

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

export default function VolumetricFog(){

  const mesh = useRef<THREE.Mesh>(null!)

  const geometry = useMemo(()=>{
    return new THREE.SphereGeometry(1,64,64)
  },[])

  const material = useMemo(()=>{

    return new THREE.MeshBasicMaterial({

      color:"#141a2a",
      transparent:true,
      opacity:0.018,
      side:THREE.BackSide,
      depthWrite:false

    })

  },[])

  useFrame(()=>{

    const m = mesh.current
    if(!m) return

    m.rotation.y += 0.00018
    m.rotation.x += 0.00006

  })

  return(

    <mesh
      ref={mesh}
      geometry={geometry}
      material={material}
      scale={[520,520,520]}
      frustumCulled={false}
    />

  )

}