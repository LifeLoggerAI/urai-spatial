"use client"

import { useState } from "react"
import Starfield from "./Starfield"
import CameraRig from "../camera/CameraRig"
import MemorySphere from "../memory/MemorySphere"

export default function SceneController(){

  const [target,setTarget] = useState(null)

  return (

    <>
      <Starfield target={target} setTarget={setTarget} />

      <CameraRig target={target} />

      <MemorySphere star={target} />
    </>

  )
}
