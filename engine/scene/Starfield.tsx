"use client"

import { useMemo } from "react"

export default function Starfield({ onStarSelect }) {

  const stars = useMemo(() => {

    const arr=[]
    const cols=5
    const rows=4
    const spacingX=3
    const spacingY=2.5

    for(let x=0;x<cols;x++){
      for(let y=0;y<rows;y++){

        const position=[
          (x-cols/2)*spacingX,
          (y-rows/2)*spacingY,
          -2
        ]

        arr.push(position)

      }
    }

    return arr

  },[])

  return (

    <group>

      {stars.map((pos,i)=>(

        <mesh
          key={i}
          position={pos}
          onPointerDown={()=>{

            console.log("STAR CLICK",pos)

            if(onStarSelect){
              onStarSelect(pos)
            }

          }}
        >

          <sphereGeometry args={[0.15,16,16]} />

          <meshStandardMaterial color="white" />

        </mesh>

      ))}

    </group>

  )

}
