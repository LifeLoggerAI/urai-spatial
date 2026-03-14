"use client"

import { useEffect, useMemo, useRef } from "react"
import { useThree, useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { useSpatialStore } from "../state/spatialStore"
import { Points, PointMaterial } from "@react-three/drei"

const EMOTION_COLORS = {
  joy: new THREE.Color("#1A1A2A"),
  love: new THREE.Color("#2A1A2A"),
  sadness: new THREE.Color("#1A1A20"),
  anger: new THREE.Color("#2A1A1A"),
  calm: new THREE.Color("#1A2A2A"),
  curiosity: new THREE.Color("#1A2A1A"),
  focus: new THREE.Color("#20202A"),
  default: new THREE.Color("#050510"),
}

function generateLayer(count: number, radius: number) {

  const arr = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {

    arr[i * 3] = (Math.random() - 0.5) * radius
    arr[i * 3 + 1] = (Math.random() - 0.5) * radius
    arr[i * 3 + 2] = (Math.random() - 0.5) * radius

  }

  return arr

}

export default function Environment() {

  const { scene, camera } = useThree()

  const { selectedStarId, stars } = useSpatialStore((s) => ({
    selectedStarId: s.selectedStarId,
    stars: s.stars,
  }))

  const targetColor = useMemo(() => {

    if (selectedStarId !== null) {

      const star = stars.find((s) => s.id === selectedStarId)
      const emotion = star?.emotion as keyof typeof EMOTION_COLORS

      return EMOTION_COLORS[emotion] || EMOTION_COLORS.default

    }

    return EMOTION_COLORS.default

  }, [selectedStarId, stars])

  useEffect(() => {

    scene.fog = new THREE.FogExp2(EMOTION_COLORS.default, 0.015)
    scene.background = new THREE.Color("#02030a")

  }, [scene])

  const p1 = useMemo(() => generateLayer(500, 100), [])
  const p2 = useMemo(() => generateLayer(1000, 200), [])
  const p3 = useMemo(() => generateLayer(2000, 400), [])

  const nearLayer = useRef<THREE.Points>(null!)
  const midLayer = useRef<THREE.Points>(null!)
  const farLayer = useRef<THREE.Points>(null!)

  const lastCameraPos = useRef(new THREE.Vector3())
  const cameraVelocity = useRef(new THREE.Vector3())

  useFrame((state, delta) => {

    cameraVelocity.current
      .copy(camera.position)
      .sub(lastCameraPos.current)

    lastCameraPos.current.copy(camera.position)

    if (nearLayer.current) {
      nearLayer.current.position.addScaledVector(cameraVelocity.current, -0.03)
    }

    if (midLayer.current) {
      midLayer.current.position.addScaledVector(cameraVelocity.current, -0.015)
    }

    if (farLayer.current) {
      farLayer.current.position.addScaledVector(cameraVelocity.current, -0.006)
    }

    if (scene.fog) {
      ;(scene.fog as THREE.FogExp2).color.lerp(targetColor, delta * 0.5)
    }

  })

  const opacity = selectedStarId !== null ? 0 : 1

  return (
    <>
      <Points ref={nearLayer} positions={p1} stride={3} frustumCulled={false}>
        <PointMaterial
          transparent
          opacity={opacity}
          color="#ffffff"
          size={0.08}
          sizeAttenuation
          depthWrite={false}
          depthTest={false}
        />
      </Points>

      <Points ref={midLayer} positions={p2} stride={3} frustumCulled={false}>
        <PointMaterial
          transparent
          opacity={opacity}
          color="#ffffff"
          size={0.05}
          sizeAttenuation
          depthWrite={false}
          depthTest={false}
        />
      </Points>

      <Points ref={farLayer} positions={p3} stride={3} frustumCulled={false}>
        <PointMaterial
          transparent
          opacity={opacity}
          color="#ffffff"
          size={0.03}
          sizeAttenuation
          depthWrite={false}
          depthTest={false}
        />
      </Points>
    </>
  )

}