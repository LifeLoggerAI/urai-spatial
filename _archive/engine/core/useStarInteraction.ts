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
    const worldPos = new THREE.Vector3()

    const getStarMeshes = () => {
      const stars: THREE.Object3D[] = []
      scene.traverse((obj) => {
        if (obj.userData?.starId) stars.push(obj)
      })
      return stars
    }

    const handlePointerMove = (event: PointerEvent) => {

      if (selectionController.isLocked()) return

      const rect = gl.domElement.getBoundingClientRect()

      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(pointer, camera)

      const intersects = raycaster.intersectObjects(getStarMeshes(), true)

      if (intersects.length > 0) {
        const starId = intersects[0].object.userData.starId
        setHoveredStarId(starId ?? null)
      } else {
        setHoveredStarId(null)
      }
    }

    const handlePointerDown = (event: PointerEvent) => {

      if (selectionController.isLocked()) return

      const rect = gl.domElement.getBoundingClientRect()

      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(pointer, camera)

      const intersects = raycaster.intersectObjects(getStarMeshes(), true)

      if (intersects.length === 0) return

      const hit = intersects[0]
      const starId = hit.object.userData.starId

      if (!starId) return

      setSelectedStarId(starId)

      hit.object.getWorldPosition(worldPos)

      selectionController.selectStar(starId, worldPos)

      setCameraMode("star")
    }

    const el = gl.domElement

    el.addEventListener("pointermove", handlePointerMove)
    el.addEventListener("pointerdown", handlePointerDown)

    return () => {
      el.removeEventListener("pointermove", handlePointerMove)
      el.removeEventListener("pointerdown", handlePointerDown)
    }

  }, [scene, camera, gl, setSelectedStarId, setHoveredStarId, setCameraMode])
}