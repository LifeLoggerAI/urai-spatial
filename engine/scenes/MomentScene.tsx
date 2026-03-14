'use client'

import { useSceneStore } from '../state/useSceneStore'
import { useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

export default function MomentScene(){

  const { scene } = useThree()

  const activeMemoryId = useSceneStore(s=>s.activeMemoryId)
  const setScene = useSceneStore(s=>s.setScene)
  const setActiveMemory = useSceneStore(s=>s.setActiveMemory)

  useEffect(()=>{
    scene.background = new THREE.Color('#0c1224')
  },[scene])

  const sphereGeometry = useMemo(()=>new THREE.SphereGeometry(30,64,64),[])
  const buttonGeometry = useMemo(()=>new THREE.BoxGeometry(14,4,2),[])

  const sphereMaterial = useMemo(()=>new THREE.MeshStandardMaterial({
    color:'#1d2a4f',
    emissive:'#2c3f7a',
    emissiveIntensity:0.6,
    roughness:0.4
  }),[])

  const buttonMaterial = useMemo(()=>new THREE.MeshStandardMaterial({
    color:'#333'
  }),[])

  return(

    <>

      <ambientLight intensity={0.6}/>

      <directionalLight
        position={[10,20,10]}
        intensity={1}
        color="#7aa0ff"
      />

      {/* Memory Sphere */}
      <mesh geometry={sphereGeometry} material={sphereMaterial} />

      {/* Return Button */}
      <mesh
        position={[0,-35,0]}
        geometry={buttonGeometry}
        material={buttonMaterial}
        onClick={()=>{
          setActiveMemory(null)
          setScene('lifemap')
        }}
      />

    </>

  )

}