"use client"

import { useEffect, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"

type PhaseLike = "HOME" | "ASCENT" | "LIFEMAP" | "FOCUS" | "REPLAY" | string

export function useCanonAscentCameraAuthority(phase: PhaseLike) {
  const { camera } = useThree()

  const ascentStartedAt = useRef<number | null>(null)
}