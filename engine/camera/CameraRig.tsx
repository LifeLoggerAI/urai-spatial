"use client"

import { useEffect, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { useSpatialStore } from "../state/spatialStore"

export default function CameraRig(){

  const { camera, gl } = useThree()

  const mode = useSpatialStore(s=>s.mode)
  const selectedStarPosition = useSpatialStore(s=>s.selectedStarPosition)
  const exploreRadius = useSpatialStore(s=>s.exploreRadius)
  const focusOffset = useSpatialStore(s=>s.focusOffset)
  const clearSelection = useSpatialStore(s=>s.clearSelection)
  const zoomBy = useSpatialStore(s=>s.zoomBy)

  const currentPos = useRef(new THREE.Vector3(0,200,260))
  const targetCamera = useRef(new THREE.Vector3())
  const targetLook = useRef(new THREE.Vector3())

  const yaw = useRef(0.7)
  const pitch = useRef(0.6)

  const dragging = useRef(false)
  const last = useRef({x:0,y:0})

  const idleTime = useRef(0)

  useEffect(()=>{

    const el = gl.domElement

    const wheel=(e:WheelEvent)=>{
      e.preventDefault()
      const dir=e.deltaY>0?1:-1
      zoomBy(dir*10)
    }

    const down=(e:MouseEvent)=>{
      dragging.current=true
      last.current.x=e.clientX
      last.current.y=e.clientY
    }

    const up=()=>dragging.current=false

    const move=(e:MouseEvent)=>{

      if(!dragging.current) return

      const dx=e.clientX-last.current.x
      const dy=e.clientY-last.current.y

      last.current.x=e.clientX
      last.current.y=e.clientY

      yaw.current-=dx*0.003
      pitch.current-=dy*0.003

      pitch.current=Math.max(0.25,Math.min(1.3,pitch.current))
    }

    const key=(e:KeyboardEvent)=>{
      if(e.key==="Escape") clearSelection()
    }

    el.addEventListener("wheel",wheel,{passive:false})
    el.addEventListener("mousedown",down)
    window.addEventListener("mouseup",up)
    window.addEventListener("mousemove",move)
    window.addEventListener("keydown",key)

    return()=>{
      el.removeEventListener("wheel",wheel as EventListener)
      el.removeEventListener("mousedown",down)
      window.removeEventListener("mouseup",up)
      window.removeEventListener("mousemove",move)
      window.removeEventListener("keydown",key)
    }

  },[gl,zoomBy,clearSelection])

  useFrame((_,dt)=>{

    const damping = 1 - Math.exp(-5*dt)

    idleTime.current += dt

    /* subtle idle drift */

    if(!dragging.current && mode !== "focus"){

      const driftYaw =
        Math.sin(idleTime.current*0.15) * 0.002

      const driftPitch =
        Math.sin(idleTime.current*0.11) * 0.0015

      yaw.current += driftYaw
      pitch.current += driftPitch
    }

    if(mode==="focus" && selectedStarPosition){

      const offset = focusOffset || [8,6,16]

      targetCamera.current.set(
        selectedStarPosition[0] + offset[0],
        selectedStarPosition[1] + offset[1],
        selectedStarPosition[2] + offset[2]
      )

      targetLook.current.set(
        selectedStarPosition[0],
        selectedStarPosition[1],
        selectedStarPosition[2]
      )

      currentPos.current.lerp(targetCamera.current,damping)

      camera.position.copy(currentPos.current)
      camera.lookAt(targetLook.current)

    }else{

      const r = exploreRadius || 260

      const x = r * Math.sin(pitch.current) * Math.sin(yaw.current)
      const y = r * Math.cos(pitch.current)
      const z = r * Math.sin(pitch.current) * Math.cos(yaw.current)

      targetCamera.current.set(x,y,z)

      currentPos.current.lerp(targetCamera.current,damping)

      camera.position.copy(currentPos.current)
      camera.lookAt(0,0,0)

    }

  })

  return null
}