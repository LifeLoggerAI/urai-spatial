"use client"

import { useMemo } from "react"
import * as THREE from "three"
import {
  STAR_COLS,
  STAR_ROWS,
  STAR_SPACING_X,
  STAR_SPACING_Y
} from "../space/starLayout"

type Props = {
  setTarget: (pos:[number,number,number], id:number) => void
  targetId: number | null
}

export default function Starfield({ setTarget, targetId }:Props){

  const geometry = useMemo(()=>{
    return new THREE.SphereGeometry(0.25,16,16)
  },[])

  const stars = useMemo(()=>{

    const arr:{id:number,position:[number,number,number]}[] = []

    let id = 0

    for(let x=0;x<STAR_COLS;x++){
      for(let y=0;y<STAR_ROWS;y++){

        arr.push({
          id:id++,
          position:[
            (x - STAR_COLS/2) * STAR_SPACING_X,
            (y - STAR_ROWS/2) * STAR_SPACING_Y,
            0
          ]
        })

      }
    }

    return arr

  },[])

  return(

    <>

      {stars.map(star=>{

        const isSelected = star.id === targetId

        if(isSelected) return null

        return(

          <mesh
            key={star.id}
            geometry={geometry}
            position={star.position}
            onClick={()=>setTarget(star.position,star.id)}
          >

            <meshBasicMaterial color="white"/>

          </mesh>

        )

      })}

    </>

  )

}