import { useThree } from "@react-three/fiber"
import { useCallback } from "react"
import gsap from "gsap"
import * as THREE from "three"

export function useCameraController() {
  const { camera } = useThree()

  const zoomTo = useCallback((target: THREE.Vector3) => {
    gsap.to(camera.position, {
      x: target.x,
      y: target.y,
      z: target.z + 5,
      duration: 1.2,
      ease: "power2.inOut"
    })
  }, [camera])

  const resetCamera = useCallback(() => {
    gsap.to(camera.position, {
      x: 0,
      y: 0,
      z: 15,
      duration: 1.2,
      ease: "power2.inOut"
    })
  }, [camera])

  return { zoomTo, resetCamera }
}
