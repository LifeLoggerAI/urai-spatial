"use client"

import { useThree, useFrame } from "@react-three/fiber"
import { useEffect, useMemo } from "react"
import * as THREE from "three"
import { useSpatialStore } from "../state/spatialStore"
import { demoData } from "../data/demoData"

const emotionColor = {
  joy: "#ffcc66",
  love: "#ff88aa",
  sadness: "#6688ff",
  anger: "#ff4444",
  calm: "#66ffaa",
  curiosity: "#ffffff",
  focus: "#ffffff",
}

export default function SpaceAtmosphere() {

  const { scene } = useThree()
  const { selectedStarId } = useSpatialStore()

  const currentColor = useMemo(() => new THREE.Color(0x050510), [])
  const targetColor = useMemo(() => new THREE.Color(0x050510), [])

  useEffect(() => {

    scene.fog = new THREE.FogExp2(currentColor, 0.015)
    scene.background = currentColor

  }, [scene, currentColor])

  useFrame(() => {

    const star =
      selectedStarId !== null
        ? demoData.find((s) => s.id === selectedStarId)
        : null

    if (star) {

      const c =
        emotionColor[star.emotion as keyof typeof emotionColor] || "#050510"

      targetColor.set(c)

    } else {

      targetColor.set(0x050510)

    }

    currentColor.lerp(targetColor, 0.02)

    if (scene.fog) {
      ;(scene.fog as THREE.FogExp2).color.copy(currentColor)
    }

    scene.background = currentColor

  })

  return null

}