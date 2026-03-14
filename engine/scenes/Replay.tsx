'use client'

import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import ReplayController from '../replay/ReplayController'

export default function Replay(){

  const { scene } = useThree()

  useEffect(()=>{
    scene.background = new THREE.Color('#060914')
  },[scene])

  return(

    <>

      <ambientLight intensity={0.5} />

      <directionalLight
        position={[12,18,10]}
        intensity={1.0}
        color="#88aaff"
      />

      <ReplayController/>

    </>

  )

}