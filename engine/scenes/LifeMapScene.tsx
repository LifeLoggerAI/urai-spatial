'use client'

import * as THREE from 'three'
import { useMemo } from 'react'
import { useLifeMapStore } from '../state/useLifeMapStore'

const STAR_COUNT = 800

function seededPosition(i:number){
  const x = Math.sin(i * 127.1) * 40
  const y = Math.cos(i * 311.7) * 30
  const z = -i * 6
  return new THREE.Vector3(x,y,z)
}

export default function LifeMapScene(){

  const setSelection = useLifeMapStore(s=>s.setSelection)
  const selectedId = useLifeMapStore(s=>s.selectedId)

  const stars = useMemo(()=>{
    return Array.from({length:STAR_COUNT}).map((_,i)=>({
      id:`star-${i}`,
      position:seededPosition(i)
    }))
  },[])

  const geometry = useMemo(()=>{
    return new THREE.SphereGeometry(1.4,24,24)
  },[])

  return(

    <group>

      {stars.map(star=>{

        const isSelected = selectedId === star.id

        return(

          <mesh
            key={star.id}
            geometry={geometry}
            position={star.position}
            onClick={(e)=>{
              e.stopPropagation()
              setSelection(star.id,star.position.clone())
            }}
          >

            <meshStandardMaterial
              color="#ffffff"
              emissive="#88aaff"
              emissiveIntensity={isSelected ? 3 : 0.35}
              roughness={0.6}
            />

          </mesh>

        )

      })}

    </group>

  )

}