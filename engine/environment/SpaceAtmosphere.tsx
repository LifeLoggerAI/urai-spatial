"use client"

import { useThree, useFrame } from "@react-three/fiber"
import { useEffect, useMemo } from "react"
import * as THREE from "three"
import { useSpatialStore } from "../state/spatialStore"
import { demoData } from "../data/demoData"

const emotionColor = {
  joy: new THREE.Color("#ffcc66"),
  love: new THREE.Color("#ff88aa"),
  sadness: new THREE.Color("#6688ff"),
  anger: new THREE.Color("#ff4444"),
  calm: new THREE.Color("#66ffaa"),
  curiosity: new THREE.Color("#ffffff"),
  focus: new THREE.Color("#ffffff"),
}

export default function SpaceAtmosphere() {

  const { scene } = useThree()
  const selectedStarId = useSpatialStore((s) => s.selectedStarId)

  const currentColor = useMemo(() => new THREE.Color(0x050510), [])
  const targetColor = useMemo(() => new THREE.Color(0x050510), [])

  const starMap = useMemo(() => {
    const map = new Map<number, any>()
    for (const s of demoData) map.set(s.id, s)
    return map
  }, [])

  useEffect(() => {

    const fog = new THREE.FogExp2(currentColor, 0.015)

    scene.fog = fog
    scene.background = currentColor

    return () => {
      scene.fog = null
    }

  }, [scene, currentColor])

  useFrame(() => {

    const star =
      selectedStarId !== null
        ? starMap.get(selectedStarId)
        : null

    if (star) {

      const c =
        emotionColor[star.emotion as keyof typeof emotionColor]

      if (c) targetColor.copy(c)
      else targetColor.set(0x050510)

    } else {

      targetColor.set(0x050510)

    }

    currentColor.lerp(targetColor, 0.02)

  })

  return null

}