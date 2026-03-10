import MemoryContent from "../memory/MemoryContent"
import MemoryContent from "../memory/MemoryContent"
import MemorySphere from "../memory/MemorySphere"
import CameraRig from "../camera/CameraRig"
import CameraRig from "../camera/CameraRig"
import CameraRig from "../camera/CameraRig"
"use client"

import { Canvas, useThree } from "@react-three/fiber"
import { useRef } from "react"
import * as THREE from "three"
import Starfield from "./Starfield"

function ClickHandler() {
  const { camera, scene, gl } = useThree()

  const raycaster = new THREE.Raycaster()
  const mouse = new THREE.Vector2()

  const handleClick = (event) => {

    const rect = gl.domElement.getBoundingClientRect()

    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    raycaster.setFromCamera(mouse, camera)

    const intersects = raycaster.intersectObjects(scene.children, true)

    if (intersects.length > 0) {
      console.log("STAR HIT", intersects[0].object)
    }
  }

  return (
    <mesh
      onClick={handleClick}
      visible={false}
    >
      <boxGeometry args={[100,100,100]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  )
}

export default function SceneRoot() {

  return (
    <div style={{width:"100vw",height:"100vh"}}>
      <Canvas camera={{position:[0,0,8],fov:50}}>
        <ambientLight intensity={1}/>
        <Starfield/>
        <CameraRig/>
        <MemorySphere/>
        <MemoryContent/>
        <MemoryContent/>
        <CameraRig/>
        <MemorySphere/>
        <MemoryContent/>
        <MemoryContent/>
        <CameraRig/>
        <MemorySphere/>
        <MemoryContent/>
        <MemoryContent/>
        <ClickHandler/>
      </Canvas>
    </div>
  )
}
