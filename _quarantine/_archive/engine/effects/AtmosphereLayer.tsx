"use client"

import { useThree } from "@react-three/fiber"
import { useEffect, useMemo } from "react"
import * as THREE from "three"

const FOG_COLOR = "#04060c"
const FOG_DENSITY = 0.0035

export default function AtmosphereLayer() {
  const scene = useThree((state) => state.scene)

  const fog = useMemo(() => {
    return new THREE.FogExp2(new THREE.Color(FOG_COLOR), FOG_DENSITY)
  }, [])

  useEffect(() => {
    const previousFog = scene.fog
    scene.fog = fog

    return () => {
      scene.fog = previousFog ?? null
    }
  }, [scene, fog])

  return null
}