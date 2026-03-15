"use client"

import { useEffect, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { useLifeMapStore } from "../state/useLifeMapStore"

const MIN_RADIUS = 60
const MAX_RADIUS = 220

export default function CameraRig() {

  const { camera, gl } = useThree()

  const selectedIndex = useLifeMapStore((s) => s.selectedIndex)
  const stars = useLifeMapStore((s) => s.stars)

  const radius = useRef(140)
  const yaw = useRef(0.8)
  const pitch = useRef(0.9)

  const dragging = useRef(false)
  const last = useRef({ x: 0, y: 0 })

  const target = useRef(new THREE.Vector3())
  const camPos = useRef(new THREE.Vector3())

  useEffect(() => {

    const el = gl.domElement

    const wheel = (e: WheelEvent) => {
      e.preventDefault()

      const dir = e.deltaY > 0 ? 1 : -1

      radius.current += dir * 12

      radius.current = Math.max(
        MIN_RADIUS,
        Math.min(MAX_RADIUS, radius.current)
      )
    }

    const down = (e: MouseEvent) => {
      dragging.current = true
      last.current.x = e.clientX
      last.current.y = e.clientY
    }

    const up = () => {
      dragging.current = false
    }

    const move = (e: MouseEvent) => {

      if (!dragging.current) return

      const dx = e.clientX - last.current.x
      const dy = e.clientY - last.current.y

      last.current.x = e.clientX
      last.current.y = e.clientY

      yaw.current -= dx * 0.003
      pitch.current -= dy * 0.003

      pitch.current = Math.max(
        0.35,
        Math.min(1.3, pitch.current)
      )
    }

    el.addEventListener("wheel", wheel, { passive: false })
    el.addEventListener("mousedown", down)
    window.addEventListener("mouseup", up)
    window.addEventListener("mousemove", move)

    return () => {
      el.removeEventListener("wheel", wheel as EventListener)
      el.removeEventListener("mousedown", down)
      window.removeEventListener("mouseup", up)
      window.removeEventListener("mousemove", move)
    }

  }, [gl])

  useFrame(() => {

    const r = radius.current

    const x = r * Math.sin(pitch.current) * Math.sin(yaw.current)
    const y = r * Math.cos(pitch.current)
    const z = r * Math.sin(pitch.current) * Math.cos(yaw.current)

    camPos.current.set(x, y, z)

    if (selectedIndex != null && stars[selectedIndex]) {
      target.current.set(
        stars[selectedIndex].position[0],
        stars[selectedIndex].position[1],
        stars[selectedIndex].position[2]
      )
    } else {
      target.current.set(0, 0, 0)
    }

    camera.position.copy(camPos.current.add(target.current))
    camera.lookAt(target.current)

  })

  return null
}