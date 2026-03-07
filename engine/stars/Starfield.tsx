"use client"

import { useMemo } from "react"
import { useSpatial } from "@/stores/spatialStore"

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
        const locked = mode==="memory"

        return(
          <mesh
            key={star.id}
            position={star.pos}
            scale={active?2.5:1}
            onPointerDown={(e)=>{

              if(locked) return

              e.stopPropagation()

              select(star.id,star.pos)

            }}
          >

            <sphereGeometry args={[0.22,10,10]}/>

            <meshBasicMaterial
              color={active ? "#ffffff" : "#aaaaaa"}
              transparent
              opacity={
                selected!==null
                  ? active ? 1 : 0.06
                  : 1
              }
            />

          </mesh>
        )

      })}
    </>
  )
}
