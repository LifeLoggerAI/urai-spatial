"use client"

import { useThree, useFrame } from "@react-three/fiber"
import { useSpatialStore } from "../state/spatialStore"
import { STAR_DATA } from "../data/starData"
import { Vector3 } from "three"
import { useRef } from "react"

const CAMERA_DISTANCE = 9

export default function CameraRig(){

  const { camera } = useThree()

  const selectedStarId = useSpatialStore(s => s.selectedStarId)

  const pos = useRef(new Vector3())
  const home = useRef(new Vector3(0, 1.5, 14))

  useFrame(() => {

    const star = STAR_DATA.find(s => s.id === selectedStarId)

    if (star) {

      pos.current.set(
        star.position[0],
        star.position[1] + 1,
        star.position[2] + CAMERA_DISTANCE
      )

      camera.position.lerp(pos.current, 0.08)

      camera.lookAt(
        star.position[0],
        star.position[1],
        star.position[2]
      )

    } else {

      camera.position.lerp(home.current, 0.06)

      camera.lookAt(0, 0, -8)

    }

  })

  return null
}