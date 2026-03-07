"use client"

import { useMemo } from "react"
import { useSpatialStore } from "../../stores/useSpatialStore"

function mulberry32(a:number){
  return function(){
    let t = a += 0x6D2B79F5
    t = Math.imul(t ^ t >>> 15, t | 1)
    t ^= t + Math.imul(t ^ t >>> 7, t | 61)
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

export default function Starfield(){

  const select = useSpatialStore(s=>s.select)
  const selected = useSpatialStore(s=>s.selected)

  const stars = useMemo(()=>{

    const rand = mulberry32(42)
    const arr:[number,number,number][] = []

    for(let i=0;i<700;i++){
      arr.push([
        (rand()-0.5)*120,
        (rand()-0.5)*120,
        (rand()-0.5)*120
      ])
    }

    return arr

  },[])

  return(
    <>
      {stars.map((p,i)=>{

        const active =
          selected &&
          p[0]===selected[0] &&
          p[1]===selected[1] &&
          p[2]===selected[2]

        return(
          <mesh
            key={i}
            position={p}
            scale={active ? 2.5 : 1}
            onPointerDown={(e)=>{
              e.stopPropagation()
              select(p)
            }}
          >
            <sphereGeometry args={[0.15,8,8]} />
            <meshBasicMaterial
              color="white"
              transparent
              opacity={
                selected
                ? active ? 1 : 0.12
                : 1
              }
            />
          </mesh>
        )
      })}
    </>
  )
}
