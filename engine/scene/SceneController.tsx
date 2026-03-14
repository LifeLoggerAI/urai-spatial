"use client"

import Starfield from "./Starfield"
import CameraRig from "../camera/CameraRig"
import MemorySphere from "../memory/MemorySphere"

export default function SceneController(){

  return (

    <>

      <CameraRig />

      <Starfield />

      <MemorySphere />

    </>

  )

}