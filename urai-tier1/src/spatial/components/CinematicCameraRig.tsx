"use client"

import { useEffect, useMemo, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"

type Vec3Tuple = [number, number, number]

type Props = {
  phase?: string
  selected?: Vec3Tuple | null
}

function normalizePhase(phase?: string) {
  const p = String(phase || "").toUpperCase()
  if (p === "ASCENT") return "ASCENT"
  if (p === "LIFEMAP") return "LIFEMAP"
  if (p === "FOCUS") return "FOCUS"
  if (p === "REPLAY") return "REPLAY"
  return "HOME"
}

function damp(current: number, target: number, lambda: number, dt: number) {
  return THREE.MathUtils.damp(current, target, lambda, dt)
}

export default function CinematicCameraRig({ phase, selected = null }: Props) {
  const p = normalizePhase(phase)
  const { camera } = useThree()

  const camPos = useRef(new THREE.Vector3(0, 0.55, 9.8))
  const camLook = useRef(new THREE.Vector3(0, 0.35, -6))

  useEffect(() => {
    camera.position.copy(camPos.current)
    camera.lookAt(camLook.current)
  }, [camera])

  const starStats = useMemo(() => {
    if (typeof window === "undefined") {
      return {
        cx: 0,
        cy: 1.5,
        cz: -24,
        minZ: -10,
        maxZ: -44,
      }
    }
    const stars = (window as any).__URAI_STARS__ || []
    if (!Array.isArray(stars) || stars.length === 0) {
      return {
        cx: 0,
        cy: 1.5,
        cz: -24,
        minZ: -10,
        maxZ: -44,
      }
    }

    let cx = 0
    let cy = 0
    let cz = 0
    let minZ = Number.POSITIVE_INFINITY
    let maxZ = Number.NEGATIVE_INFINITY

    for (let i = 0; i < stars.length; i++) {
      cx += stars[i].position[0]
      cy += stars[i].position[1]
      cz += stars[i].position[2]
      minZ = Math.min(minZ, stars[i].position[2])
      maxZ = Math.max(maxZ, stars[i].position[2])
    }

    return {
      cx: cx / stars.length,
      cy: cy / stars.length,
      cz: cz / stars.length,
      minZ,
      maxZ,
    }
  }, [phase, selected])

  useFrame((_, dt) => {
    let targetPos = new THREE.Vector3(0, 0.55, 9.8)
    let targetLook = new THREE.Vector3(0, 0.35, -6)
    let lambda = 2.8

    if (p === "ASCENT") {
      targetPos = new THREE.Vector3(0, 1.6, 6.3)
      targetLook = new THREE.Vector3(0, 1.0, -11)
      lambda = 2.2
    } else if (p === "LIFEMAP") {
      targetPos = new THREE.Vector3(
        starStats.cx + 4.8,
        Math.max(2.2, starStats.cy + 2.0),
        18.5
      )
      targetLook = new THREE.Vector3(
        starStats.cx - 2.8,
        Math.max(1.5, starStats.cy + 0.5),
        Math.min(-24, starStats.cz - 10)
      )
      lambda = 1.55
    } else if (p === "FOCUS" && selected) {
      targetPos = new THREE.Vector3(
        selected[0] + 2.4,
        selected[1] + 0.95,
        selected[2] + 8.6
      )
      targetLook = new THREE.Vector3(
        selected[0] - 0.75,
        selected[1] + 0.18,
        selected[2] - 1.9
      )
      lambda = 2.35
    } else if (p === "REPLAY" && selected) {
      targetPos = new THREE.Vector3(
        selected[0] + 1.2,
        selected[1] + 0.45,
        selected[2] + 4.2
      )
      targetLook = new THREE.Vector3(
        selected[0],
        selected[1],
        selected[2] - 2.8
      )
      lambda = 2.1
    }

    camPos.current.set(
      damp(camPos.current.x, targetPos.x, lambda, dt),
      damp(camPos.current.y, targetPos.y, lambda, dt),
      damp(camPos.current.z, targetPos.z, lambda, dt)
    )
    camLook.current.set(
      damp(camLook.current.x, targetLook.x, lambda, dt),
      damp(camLook.current.y, targetLook.y, lambda, dt),
      damp(camLook.current.z, targetLook.z, lambda, dt)
    )

    camera.position.copy(camPos.current)
    camera.lookAt(camLook.current)
  })

  return null
}
