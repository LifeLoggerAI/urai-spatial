"use client"

import { useRef, useEffect } from "react"
import { useThree } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"

export default function CameraRig() {
  const { camera, gl } = useThree()
  const controlsRef = useRef<any>(null)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        camera.position.set(0, 80, 260)
        controlsRef.current?.target.set(0, 0, 0)
        controlsRef.current?.update()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [camera])

  return (
    <OrbitControls
      ref={controlsRef}
      args={[camera, gl.domElement]}
      enableDamping={true}
      dampingFactor={0.05}
      rotateSpeed={0.4}
      panSpeed={0.5}
      zoomSpeed={1.0}
      minDistance={50}
      maxDistance={600}
      maxPolarAngle={Math.PI / 2 - 0.05}
    />
  )
}
