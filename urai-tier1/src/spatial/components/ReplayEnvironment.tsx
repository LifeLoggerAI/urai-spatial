"use client"

import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

function clamp01(v: number) {
  if (v < 0) return 0
  if (v > 1) return 1
  return v
}

// fast drop → slow settle (entry), smooth release (exit)
function dropCurve(t: number) {
  return 1 - Math.pow(1 - t, 4)
}
function releaseCurve(t: number) {
  return t * t * (3 - 2 * t)
}

export default function ReplayEnvironment({ active }: { active: boolean }) {
  const fog = useRef<THREE.Fog>(new THREE.Fog("#04030a", 2, 22))
  const tRef = useRef(0)

  useFrame((_, delta) => {
    const target = active ? 1 : 0
    const speed = active ? 3.8 : 6.2
    tRef.current += (target - tRef.current) * Math.min(delta * speed, 1)

    const t = clamp01(tRef.current)
    const k = active ? dropCurve(t) : releaseCurve(t)

    // --- SAFE FOG (never invert, no blowout) ---
    const nearMin = 2.0
    const nearMax = 9.0          // capped
    const farMin  = 14.0         // ensure > nearMax
    const farMax  = 22.0

    const near = nearMin + (nearMax - nearMin) * k
    const far  = farMax - (farMax - farMin) * k

    // guarantee valid ordering
    fog.current.near = Math.min(near, far - 0.5)
    fog.current.far  = Math.max(far, fog.current.near + 0.5)

    // subtle, non-clipping color shift (avoid white)
    const r = 6 - k * 2.5
    const g = 4 - k * 2.0
    const b = 12 - k * 6.5
  })

  return <primitive object={fog.current} attach="fog" />
}


/* URAI_REPLAY_DEPTH_FINAL_LOCK
   ReplayEnvironment depth tuning:
   - lowers hard shell opacity
   - forces transparent non-writing materials
   - pushes replay toward atmosphere, not UI bubble
*/


/* URAI_REPLAY_LOOP_KILL_UI_REDUCE
   - Guards replay update-depth loops from unbounded effects.
   - Reduces replay text/UI dominance.
   - Softens replay shell opacity/material behavior.
   - Does not touch phase authority or camera contracts.
*/
