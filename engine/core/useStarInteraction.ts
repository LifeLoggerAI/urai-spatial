'use client'

import { useThree } from "@react-three/fiber"
import { useEffect } from "react"
import * as THREE from "three"
import { selectionController } from "./selection-controller"
import { useSpatialStore } from "../state/spatialStore"

export const useStarInteraction = () => {

  const { scene, camera, gl } = useThree()

  const {
    setSelectedStarId,
    setHoveredStarId,
    setCameraMode
  } = useSpatialStore()

  useEffect(() => {

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()

    const handlePointerMove = (event: PointerEvent) => {

      if (selectionController.isLocked()) return

      const rect = gl.domElement.getBoundingClientRect()

      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(pointer, camera)

      const intersects = raycaster.intersectObjects(scene.children, true)

      for (const hit of intersects) {

        const starId = hit.object.userData.starId

        if (starId) {
          setHoveredStarId(starId)
          return
        }
      }

      setHoveredStarId(null)
    }

    const handleClick = (event: PointerEvent) => {

      if (selectionController.isLocked()) return

      const rect = gl.domElement.getBoundingClientRect()

      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(pointer, camera)

      const intersects = raycaster.intersectObjects(scene.children, true)

      for (const hit of intersects) {

        const starId = hit.object.userData.starId

        if (starId) {

          setSelectedStarId(starId)

          const worldPos = new THREE.Vector3()
          hit.object.getWorldPosition(worldPos)

          selectionController.selectStar(starId, worldPos)

          setCameraMode("star")

          return
        }
      }
    }

    gl.domElement.addEventListener("pointermove", handlePointerMove)
    gl.domElement.addEventListener("click", handleClick)

    return () => {
      gl.domElement.removeEventListener("pointermove", handlePointerMove)
      gl.domElement.removeEventListener("click", handleClick)
    }

  }, [scene, camera, gl, setSelectedStarId, setHoveredStarId, setCameraMode])
}