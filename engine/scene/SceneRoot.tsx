cat << 'EOF' > engine/scene/SceneRoot.tsx
"use client"

import { Canvas } from "@react-three/fiber"
import { useEffect } from "react"
import { useNavStore } from "../state/navigationState"

import Starfield from "./Starfield"
import CameraRig from "../camera/CameraRig"
import MemorySphere from "../memory/MemorySphere"
import MemoryContent from "../memory/MemoryContent"

export default function SceneRoot(){

  const setZoom = useNavStore(s=>s.setZoom)

  useEffect(()=>{

    const wheel = (e:WheelEvent)=>{

      e.preventDefault()

      useNavStore.setState((state)=>{

        let next = state.zoomLevel

        if(e.deltaY > 0) next = Math.min(2,next+1)
        else next = Math.max(0,next-1)

        return { zoomLevel:next }

      })

    }

    window.addEventListener("wheel",wheel,{passive:false})

    return ()=>window.removeEventListener("wheel",wheel)

  },[])

  return(

    <div style={{width:"100vw",height:"100vh"}}>

      <Canvas camera={{position:[0,0,8],fov:50}}>

        <ambientLight intensity={1}/>

        <Starfield/>
        <CameraRig/>
        <MemorySphere/>
        <MemoryContent/>

      </Canvas>

    </div>

  )

}
EOF