"use client"

import { useMemo } from "react"
import { useSpatial } from "@/stores/spatialStore"
import { createStarGlowMaterial } from "./StarGlowMaterial"

function mulberry32(a:number){
  return function(){
    let t = a += 0x6D2B79F5
    t = Math.imul(t ^ t >>> 15, t | 1)
    t ^= t + Math.imul(t ^ t >>> 7, t | 61)
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

export default function Starfield(){

  const select = useSpatial(s=>s.select)
  const selected = useSpatial(s=>s.selected)
  const mode = useSpatial(s=>s.spatialMode)

  const stars = useMemo(()=>{

    const rand = mulberry32(42)

    const arr:{id:number,pos:[number,number,number]}[]=[]

    for(let i=0;i<600;i++){

      arr.push({
        id:i,
        pos:[
          (rand()-0.5)*120,
          (rand()-0.5)*120,
          (rand()-0.5)*120
        ]
      })

    }

    return arr

  },[])

  return(
    <>
      {stars.map(star=>{

        const active = selected===star.id

        const opacity =
          selected!==null
            ? active ? 1.0 : 0.05
            : 1.0

        return(

          <mesh
            key={star.id}
            position={star.pos}
            scale={active?2.6:1}

            onPointerDown={(e)=>{

              if(mode==="memory") return

              e.stopPropagation()

              select(star.id,star.pos)

            }}

          >

            <sphereGeometry args={[0.22,10,10]}/>

            <primitive
              object={createStarGlowMaterial("#9dd6ff", active?2.6:1)}
              attach="material"
              opacity={opacity}
            />

          </mesh>

        )

      })}
    </>
  )
}
