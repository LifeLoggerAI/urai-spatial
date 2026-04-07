"use client"
import { useMemo, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"

export default function GPUStarfield({ count = 1500, radius = 40, speed = 0.5 }) {
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
      size: 0.4,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  }, [])

  useFrame((state) => {
    if (!pointsRef.current) return
    const t = state.clock.elapsedTime
    const posAttr = geometry.attributes.position
    for (let i = 0; i < posAttr.count; i++) {
      const ix = i * 3
      const dz = positions[ix + 2] - camera.position.z
      const scaleFactor = Math.max(0.2, 1 - dz / (radius * 2))
      pointsRef.current.material.size = 0.4 * scaleFactor * (0.8 + 0.2 * Math.sin(t * 0.5))
      pointsRef.current.material.opacity = 0.7 * scaleFactor + 0.1
      positions[ix + 2] += speed * 0.1
      if (positions[ix + 2] > camera.position.z + radius) positions[ix + 2] = -radius
    }
    posAttr.needsUpdate = true

    // subtle rotation reacts to camera movement
    const camX = camera.position.x / 200
    const camY = camera.position.y / 200
    pointsRef.current.rotation.y = t * 0.02 + camX
    pointsRef.current.rotation.x = Math.sin(t * 0.1) * 0.01 + camY
  })

  return <points ref={pointsRef} geometry={geometry} material={material} />
}
