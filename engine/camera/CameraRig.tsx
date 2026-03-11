"use client"

import { useThree, useFrame } from "@react-three/fiber"
import { useSpatialStore } from "../state/spatialStore"
import { Vector3 } from "three"
import { useRef, useEffect } from "react"

export default function CameraRig(){

  const { camera, gl } = useThree()

  const target = useSpatialStore(s=>s.cameraTarget)
  const clearStar = useSpatialStore(s=>s.clearStar)

  const pos = useRef(new Vector3())
  const home = useRef(new Vector3(0,0,6))

  const zoom = useRef(6)

  useEffect(()=>{

    const wheel = (e:WheelEvent)=>{

      e.preventDefault()

      zoom.current += e.deltaY * 0.01

      if(zoom.current < 2) zoom.current = 2
      if(zoom.current > 12) zoom.current = 12

    }

    const key = (e:KeyboardEvent)=>{

      if(e.key === "Escape"){
        clearStar()
      }

    }

    const canvas = gl.domElement

    canvas.addEventListener("wheel", wheel, { passive:false })
    window.addEventListener("keydown", key)

    return ()=>{
      canvas.removeEventListener("wheel", wheel)
      window.removeEventListener("keydown", key)
    }

  },[gl,clearStar])

  useFrame(()=>{

    if(target){

      pos.current.set(
        target[0],
        target[1],
        target[2] + 3
      )

      camera.position.lerp(pos.current,0.08)

      camera.lookAt(
        target[0],
        target[1],
        target[2]
      )

    } else {

      const homePos = new Vector3(
        home.current.x,
        home.current.y,
        zoom.current
      )

      camera.position.lerp(homePos,0.06)

      camera.lookAt(0,0,-5)

    }

  })

  return null
}
