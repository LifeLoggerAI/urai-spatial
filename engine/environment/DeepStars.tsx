'use client'

import { useMemo, useRef } from "react"
import * as THREE from "three"
import { useFrame, useThree } from "@react-three/fiber"

const generateStars = (count: number, radius: number, seed: number) => {

  const positions = new Float32Array(count * 3)

  let s = seed

  const random = () => {
    const x = Math.sin(s++) * 10000
    return x - Math.floor(x)
  }

  for (let i = 0; i < count; i++) {

    const r = radius * (random() * 0.6 + 0.4)
    const theta = 2 * Math.PI * random()
    const phi = Math.acos(2 * random() - 1)

    const x = r * Math.sin(phi) * Math.cos(theta)
    const y = r * Math.sin(phi) * Math.sin(theta)
    const z = r * Math.cos(phi)

    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z

  }

  const g = new THREE.BufferGeometry()
  g.setAttribute("position", new THREE.BufferAttribute(positions, 3))

  return g

}

const generateDust = (count: number, radius: number) => {

  const arr = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {

    arr[i * 3] = (Math.random() - 0.5) * radius
    arr[i * 3 + 1] = (Math.random() - 0.5) * radius
    arr[i * 3 + 2] = (Math.random() - 0.5) * radius

  }

  return arr

}

export default function DeepStars() {

  const nearStars = useMemo(() => generateStars(60, 20, 42), [])
  const midStars = useMemo(() => generateStars(200, 80, 43), [])
  const farStars = useMemo(() => generateStars(400, 160, 44), [])

  const dustPositions = useMemo(() => generateDust(1000, 200), [])

  const nearLayer = useRef<THREE.Group>(null!)
  const midLayer = useRef<THREE.Group>(null!)
  const farLayer = useRef<THREE.Group>(null!)
  const dustLayer = useRef<THREE.Points>(null!)

  const { camera } = useThree()

  const lastCameraPos = useRef(new THREE.Vector3())
  const cameraVelocity = useRef(new THREE.Vector3())

  useFrame(({ clock }) => {

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
      farLayer.current.position.addScaledVector(cameraVelocity.current, -0.005)
    }

    if (dustLayer.current) {
      dustLayer.current.rotation.y = clock.elapsedTime * 0.01
    }

  })

  return (

    <>

      <group ref={nearLayer}>

        <points geometry={nearStars}>

          <pointsMaterial
            color="#bbbbbb"
            size={0.08}
            sizeAttenuation
            depthWrite={false}
            fog={false}
          />

        </points>

      </group>

      <group ref={midLayer} scale={2}>

        <points geometry={midStars}>

          <pointsMaterial
            color="#888888"
            size={0.05}
            sizeAttenuation
            depthWrite={false}
            fog={false}
          />

        </points>

      </group>

      <group ref={farLayer} scale={4}>

        <points geometry={farStars}>

          <pointsMaterial
            color="#555555"
            size={0.03}
            sizeAttenuation
            depthWrite={false}
            fog={false}
          />

        </points>

      </group>

      <points ref={dustLayer}>

        <bufferGeometry>

          <bufferAttribute
            attach="attributes-position"
            array={dustPositions}
            count={dustPositions.length / 3}
            itemSize={3}
          />

        </bufferGeometry>

        <pointsMaterial
          color="#8888ff"
          size={0.15}
          sizeAttenuation
          depthWrite={false}
        />

      </points>

    </>

  )

}