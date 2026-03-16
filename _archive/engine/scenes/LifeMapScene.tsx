'use client'

import * as THREE from 'three'
import { useMemo } from 'react'
import { useLifeMapStore } from '../state/useLifeMapStore'

const STAR_COUNT = 800

function seededPosition(i: number){

  const seed = i * 0.73

  const x =
    Math.sin(seed * 127.1) * 40

  const y =
    Math.cos(seed * 311.7) * 30

  const z =
    -i * 5 +
    Math.sin(seed * 91.3) * 8

  return new THREE.Vector3(x,y,z)

}

export default function LifeMapScene(){

  const setSelection =
    useLifeMapStore(s => s.setSelection)

  const selectedId =
    useLifeMapStore(s => s.selectedId)

  const stars = useMemo(()=>{

    return Array.from(
      { length: STAR_COUNT },
      (_,i)=>({

        id:`star-${i}`,
        position: seededPosition(i)

      })

    )

  },[])

  const geometry = useMemo(()=>{

    return new THREE.SphereGeometry(
      1.4,
      24,
      24
    )

  },[])

  const material = useMemo(()=>{

    return new THREE.MeshStandardMaterial({

      color:"#ffffff",
      emissive:"#88aaff",
      roughness:0.55,
      metalness:0.0

    })

  },[])

  return(

    <group>

      {stars.map(star=>{

        const isSelected =
          selectedId === star.id

        return(

          <mesh
            key={star.id}
            geometry={geometry}
            material={material}
            position={star.position}
            onClick={(e)=>{

              e.stopPropagation()

              setSelection(
                star.id,
                star.position.clone()
              )

            }}
          >

            <meshStandardMaterial
              color="#ffffff"
              emissive="#88aaff"
              emissiveIntensity={
                isSelected ? 3 : 0.35
              }
              roughness={0.6}
            />

          </mesh>

        )

      })}

    </group>

  )

}