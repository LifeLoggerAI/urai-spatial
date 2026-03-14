"use client"

import { useRef, useMemo } from "react"
import { useFrame, useThree, useLoader } from "@react-three/fiber"
import * as THREE from "three"

const STREAK_COUNT = 700
const FIELD_SIZE = 900

export default function HyperspaceStreaks(){

  const { camera } = useThree()

  const mesh = useRef<THREE.InstancedMesh>(null!)
  const prev = useRef(new THREE.Vector3())

  const texture = useLoader(
    THREE.TextureLoader,
    "/star-sprite.png"
  )

  const geometry = useMemo(()=>{
    return new THREE.PlaneGeometry(0.6,6)
  },[])

  const material = useMemo(()=>{

    return new THREE.MeshBasicMaterial({
      map:texture,
      transparent:true,
      depthWrite:false,
      opacity:0.45,
      blending:THREE.AdditiveBlending
    })

  },[texture])

  const positions = useMemo(()=>{

    const list:THREE.Vector3[] = []

    for(let i=0;i<STREAK_COUNT;i++){

      list.push(
        new THREE.Vector3(
          (Math.random()-0.5)*FIELD_SIZE,
          (Math.random()-0.5)*FIELD_SIZE,
          (Math.random()-0.5)*FIELD_SIZE
        )
      )

    }

    return list

  },[])

  const dummy = useMemo(()=> new THREE.Object3D(),[])
  const direction = useMemo(()=> new THREE.Vector3(),[])
  const target = useMemo(()=> new THREE.Vector3(),[])

  useFrame(()=>{

    if(!mesh.current) return

    const velocity = camera.position.distanceTo(prev.current)

    direction
      .subVectors(camera.position, prev.current)
      .normalize()

    prev.current.copy(camera.position)

    const speed = THREE.MathUtils.clamp(
      velocity * 60,
      0,
      12
    )

    mesh.current.visible = speed > 0.02

    for(let i=0;i<positions.length;i++){

      const p = positions[i]

      /* keep streaks around camera volume */

      const worldPos = p.clone().add(camera.position)

      dummy.position.copy(worldPos)

      /* orient along travel direction */

      target.copy(worldPos).add(direction)
      dummy.lookAt(target)

      const length = 1 + speed * 6

      dummy.scale.set(
        0.25,
        length,
        1
      )

      dummy.updateMatrix()

      mesh.current.setMatrixAt(
        i,
        dummy.matrix
      )

    }

    mesh.current.instanceMatrix.needsUpdate = true

  })

  return(

    <instancedMesh
      ref={mesh}
      args={[geometry,material,STREAK_COUNT]}
      frustumCulled={false}
    />

  )

}