"use client"

import { useRef, useEffect } from "react"
import * as THREE from "three"
import { useSpatialStore } from "../state/spatialStore"

const COUNT = 120

export default function Starfield(){

  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const dummy = new THREE.Object3D()

  const selectStar = useSpatialStore(s=>s.selectStar)
  const setPositions = useSpatialStore(s=>s.setStarPositions)
  const selected = useSpatialStore(s=>s.selectedStarId)

  const positionsRef = useRef<THREE.Vector3[]>([])

  useEffect(()=>{

    const mesh = meshRef.current
    if(!mesh) return

    if(positionsRef.current.length===0){

      for(let i=0;i<COUNT;i++){

        const angle = i * 0.618
        const radius = 120 + (i % 6) * 20

        const x = Math.cos(angle) * radius
        const y = (i % 8) * 20 - 80
        const z = Math.sin(angle) * radius

        positionsRef.current.push(new THREE.Vector3(x,y,z))

      }

      setPositions(positionsRef.current)

    }

    for(let i=0;i<COUNT;i++){

      const p = positionsRef.current[i]
      const scale = selected===i ? 3 : 1.2

      dummy.position.copy(p)
      dummy.scale.setScalar(scale)
      dummy.updateMatrix()

      mesh.setMatrixAt(i,dummy.matrix)

    }

    mesh.instanceMatrix.needsUpdate = true

  },[selected,setPositions])

  const click=(e:any)=>{
    e.stopPropagation()
    if(e.instanceId!==undefined){
      selectStar(e.instanceId)
    }
  }

  return(

    <instancedMesh
      ref={meshRef}
      args={[
        new THREE.SphereGeometry(1,16,16),
        new THREE.MeshBasicMaterial({color:"white"}),
        COUNT
      ]}
      onPointerDown={click}
      frustumCulled={false}
    />

  )

}
