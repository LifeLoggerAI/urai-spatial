"use client"

import { useState, useEffect } from "react"
import { Canvas } from "@react-three/fiber"
import SpatialScene from "./SpatialScene"

export default function SkyTransition(){

  const [entered,setEntered] = useState(false)
  const [fade,setFade] = useState(false)

  useEffect(()=>{
    if(entered){
      setTimeout(()=>setFade(true),150)
    }
  },[entered])

  if(!entered){

    return(

      <div
        style={{
          width:"100vw",
          height:"100vh",
          background:"radial-gradient(ellipse at center,#060615 0%,#000000 85%)",
          display:"flex",
          alignItems:"center",
          justifyContent:"center",
          cursor:"pointer",
          transition:"opacity 1.2s",
          opacity: fade ? 0 : 1
        }}
        onClick={()=>setEntered(true)}
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

    )

  }

  return(

    <Canvas
      camera={{ position:[0,0,6], fov:60 }}
      style={{
        width:"100vw",
        height:"100vh",
        background:"#000000"
      }}
    >

      <SpatialScene />

    </Canvas>

  )

}