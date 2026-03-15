"use client"
import { useRef, useMemo } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"

export default function WarpTrails({ count = 800, radius = 40 }) {
  const pointsRef = useRef<THREE.Points>(null)
  const { camera } = useThree()

  const positions = useMemo(() => {
    const pos: number[] = []
    for (let i = 0; i < count; i++) {
      const u = Math.random()
      const v = Math.random()
      const theta = 2 * Math.PI * u
      const phi = Math.acos(2 * v - 1)
      const x = radius * Math.sin(phi) * Math.cos(theta)
      const y = radius * Math.sin(phi) * Math.sin(theta)
      const z = radius * Math.cos(phi)
      pos.push(x, y, z)
    }
    return new Float32Array(pos)
  }, [count, radius])

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    return geo
  }, [positions])

  const material = useMemo(() => {
    return new THREE.PointsMaterial({
      color: "#ffffff",
      size: 0.15,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  }, [])

  useFrame(() => {
    if (!pointsRef.current) return
    const camVel = camera.position.clone().sub(pointsRef.current.userData.prevCam || camera.position)
    pointsRef.current.userData.prevCam = camera.position.clone()
    const posAttr = geometry.attributes.position
    for (let i = 0; i < posAttr.count; i++) {
      const ix = i * 3
      positions[ix] -= camVel.x * 0.5
      positions[ix + 1] -= camVel.y * 0.5
      positions[ix + 2] -= camVel.z * 0.5
      if (positions[ix] > radius) positions[ix] = -radius
      if (positions[ix] < -radius) positions[ix] = radius
      if (positions[ix + 1] > radius) positions[ix + 1] = -radius
      if (positions[ix + 1] < -radius) positions[ix + 1] = radius
      if (positions[ix + 2] > radius) positions[ix + 2] = -radius
      if (positions[ix + 2] < -radius) positions[ix + 2] = radius
    }
    posAttr.needsUpdate = true
  })

  return <points ref={pointsRef} geometry={geometry} material={material} />
}
