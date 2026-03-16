'use client'

import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import ReplayController from '../replay/ReplayController'

export default function Replay(){

  const { scene } = useThree()

  useEffect(()=>{

    const previousBackground = scene.background

    scene.background = new THREE.Color('#060914')

    return ()=>{
      scene.background = previousBackground
    }

  },[scene])

  return(

    <>

      <ambientLight intensity={0.45} />

      <directionalLight
        position={[12,18,10]}
        intensity={0.9}
        color="#88aaff"
      />

      <ReplayController/>

    </>

  )

}