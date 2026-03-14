"use client"

import { useState, useEffect, useRef } from "react"
import { Canvas } from "@react-three/fiber"

import SpatialScene from "./SpatialScene"

export default function SkyTransition(){

  const [entered,setEntered] = useState(false)
  const [fade,setFade] = useState(false)

  const timer = useRef<number | null>(null)

  useEffect(()=>{

    if(entered){

      timer.current = window.setTimeout(()=>{
        setFade(true)
      },150)

    }

    return ()=>{
      if(timer.current) clearTimeout(timer.current)
    }

  },[entered])

  return(

    <div
      style={{
        width:"100vw",
        height:"100vh",
        position:"relative",
        overflow:"hidden",
        background:"#000000"
      }}
    >

      <Canvas
        camera={{ position:[0,2,16], fov:60 }}
        style={{
          width:"100%",
          height:"100%"
        }}
      >
        <SpatialScene/>
      </Canvas>

      {!entered && (

        <div
          onClick={()=>setEntered(true)}
          style={{
            position:"absolute",
            inset:0,
            display:"flex",
            alignItems:"center",
            justifyContent:"center",
            cursor:"pointer",
            background:"radial-gradient(ellipse at center,#060615 0%,#000000 85%)",
            transition:"opacity 1.2s",
            opacity: fade ? 0 : 1
          }}
        >

          <div
            style={{
              color:"#ffffff",
              fontSize:"22px",
              letterSpacing:"3px",
              opacity:0.75,
              userSelect:"none"
            }}
          >
            ENTER THE SKY
          </div>

        </div>

      )}

    </div>

  )

}